<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderChatMessageCreated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderChatMessage;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class OrderChatController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService,
    ) {
    }

    public function index(Request $request, int $id)
    {
        $order = Order::query()->findOrFail($id);
        $this->authorizeChat($request, $order);

        $messages = OrderChatMessage::query()
            ->where('order_id', $order->id)
            ->orderByDesc('id')
            ->limit(80)
            ->with(['sender:id,full_name,avatar'])
            ->get(['id', 'order_id', 'sender_id', 'type', 'body', 'image_path', 'created_at'])
            ->reverse()
            ->values()
            ->map(fn(OrderChatMessage $m) => [
                'id' => (int) $m->id,
                'order_id' => (int) $m->order_id,
                'sender_id' => (int) $m->sender_id,
                'sender' => $m->sender ? [
                    'id' => (int) $m->sender->id,
                    'full_name' => (string) ($m->sender->full_name ?? ''),
                    'avatar' => $m->sender->avatar,
                ] : null,
                'type' => (string) $m->type,
                'body' => $m->body,
                'image_path' => $m->image_path,
                'created_at' => $m->created_at?->toISOString(),
            ]);

        return response()->json(['messages' => $messages]);
    }

    public function store(Request $request, int $id)
    {
        $order = Order::query()->findOrFail($id);
        $this->authorizeChat($request, $order);

        if (!$order->courier_id) {
            throw ValidationException::withMessages([
                'order' => ['Courier belum assigned. Chat belum tersedia.'],
            ]);
        }

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'file', 'image', 'max:6144'],
        ]);

        $body = isset($data['body']) ? trim((string) $data['body']) : '';
        $hasImage = $request->hasFile('image');
        if ($body === '' && !$hasImage) {
            throw ValidationException::withMessages([
                'body' => ['Message kosong.'],
            ]);
        }

        $imagePath = null;
        $type = $hasImage ? 'image' : 'text';

        if ($hasImage) {
            $file = $request->file('image');
            $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $ext = 'jpg';
            }
            $name = 'chat_' . $order->id . '_' . now()->format('YmdHis') . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
            $path = 'uploads/order_chats/' . $name;
            $imagePath = $this->storeCompressed($file->getPathname(), $ext, $path);
        }

        $m = OrderChatMessage::query()->create([
            'order_id' => $order->id,
            'sender_id' => (int) $request->user()->id,
            'type' => $type,
            'body' => $body !== '' ? $body : null,
            'image_path' => $imagePath,
        ]);

        OrderChatMessageCreated::dispatch($m);

        $senderId = (int) $request->user()->id;
        $orderNumber = $order->order_number ? (string) $order->order_number : null;
        $preview = $hasImage ? '[Foto]' : $body;
        $preview = trim((string) $preview);
        if (strlen($preview) > 140) {
            $preview = substr($preview, 0, 140) . '…';
        }

        $targets = array_values(array_filter([
            $order->member_id ? (int) $order->member_id : null,
            $order->courier_id ? (int) $order->courier_id : null,
        ]));

        foreach ($targets as $uid) {
            if ((int) $uid === $senderId) {
                continue;
            }
            $url = $uid === (int) $order->courier_id
                ? ($orderNumber ? '/courier/delivery/' . $orderNumber : null)
                : ($orderNumber ? '/orders/' . $orderNumber : null);

            $this->notificationService->notifyUser(
                (int) $uid,
                'order_chat_message',
                $orderNumber ? 'Chat #' . $orderNumber : 'Chat',
                array_filter([
                    'order_id' => (int) $order->id,
                    'order_number' => $orderNumber,
                    'chat_message_id' => (int) $m->id,
                    'sender_id' => (int) $senderId,
                    'body' => $preview !== '' ? $preview : null,
                    'url' => $url,
                ], fn($v) => $v !== null),
            );
        }

        return response()->json([
            'message' => [
                'id' => (int) $m->id,
                'order_id' => (int) $m->order_id,
                'sender_id' => (int) $m->sender_id,
                'type' => (string) $m->type,
                'body' => $m->body,
                'image_path' => $m->image_path,
                'created_at' => $m->created_at?->toISOString(),
            ],
        ]);
    }

    protected function authorizeChat(Request $request, Order $order): void
    {
        $u = $request->user();
        if ($u->hasRole('admin')) {
            return;
        }
        if ((int) $order->member_id === (int) $u->id) {
            return;
        }
        if ($order->courier_id && (int) $order->courier_id === (int) $u->id) {
            return;
        }
        abort(403);
    }

    protected function storeCompressed(string $tmpPath, string $ext, string $destPath): string
    {
        $ext = strtolower($ext);
        $img = null;
        if (in_array($ext, ['jpg', 'jpeg'], true) && function_exists('imagecreatefromjpeg')) {
            $img = @imagecreatefromjpeg($tmpPath);
        } elseif ($ext === 'png' && function_exists('imagecreatefrompng')) {
            $img = @imagecreatefrompng($tmpPath);
        } elseif ($ext === 'webp' && function_exists('imagecreatefromwebp')) {
            $img = @imagecreatefromwebp($tmpPath);
        }

        $destFull = public_path($destPath);
        File::ensureDirectoryExists(dirname($destFull));

        if (!$img) {
            File::put($destFull, file_get_contents($tmpPath));
            return $destPath;
        }

        $w = imagesx($img);
        $h = imagesy($img);

        $targetBytes = 260 * 1024;
        $maxWidths = [1280, 1024, 800];
        $qualities = [60, 52, 45, 38, 32];
        $bestBin = null;
        $bestPath = null;

        $format = function_exists('imagewebp') ? 'webp' : (function_exists('imagejpeg') ? 'jpg' : null);
        if (!$format) {
            File::put($destFull, file_get_contents($tmpPath));
            if (is_resource($img)) {
                imagedestroy($img);
            }
            return $destPath;
        }

        foreach ($maxWidths as $maxW) {
            $scale = ($w > $maxW) ? ($maxW / max(1, $w)) : 1.0;
            $nw = (int) max(1, round($w * $scale));
            $nh = (int) max(1, round($h * $scale));

            $out = $img;
            if (($nw !== $w || $nh !== $h) && function_exists('imagecreatetruecolor')) {
                $dst = imagecreatetruecolor($nw, $nh);
                imagealphablending($dst, true);
                imagesavealpha($dst, true);
                imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
                $out = $dst;
            }

            foreach ($qualities as $q) {
                ob_start();
                $saved = false;
                if ($format === 'webp' && function_exists('imagewebp')) {
                    $saved = imagewebp($out, null, $q);
                } elseif ($format === 'jpg' && function_exists('imagejpeg')) {
                    $saved = imagejpeg($out, null, $q);
                }
                $bin = ob_get_clean();

                if ($saved && is_string($bin) && $bin !== '') {
                    $p = $destPath;
                    if ($format === 'webp') {
                        $p = preg_replace('/\.(jpe?g|png|webp)$/i', '.webp', $destPath) ?: $destPath;
                    } else {
                        $p = preg_replace('/\.(png|webp)$/i', '.jpg', $destPath) ?: $destPath;
                    }

                    if ($bestBin === null || strlen($bin) < strlen($bestBin)) {
                        $bestBin = $bin;
                        $bestPath = $p;
                    }
                    if (strlen($bin) <= $targetBytes) {
                        if ($out !== $img && is_resource($out)) {
                            imagedestroy($out);
                        }
                        break 2;
                    }
                }
            }

            if ($out !== $img && is_resource($out)) {
                imagedestroy($out);
            }
        }

        if (is_resource($img)) {
            imagedestroy($img);
        }

        if ($bestBin && $bestPath) {
            $bestFull = public_path($bestPath);
            File::ensureDirectoryExists(dirname($bestFull));
            File::put($bestFull, $bestBin);
            return $bestPath;
        }

        File::put($destFull, file_get_contents($tmpPath));
        return $destPath;
    }
}
