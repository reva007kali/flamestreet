<?php

namespace App\Services\Payments;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DokuSnapClient
{
                    public function getB2BAccessToken(): string
                    {
                                        $cache = Cache::store(config('cache.default'));
                                        $cached = $cache->get('doku.snap.b2b.token');
                                        if (is_string($cached) && $cached !== '') {
                                                            return $cached;
                                        }

                                        $timestamp = $this->timestamp();
                                        $clientKey = (string) config('doku.client_key');

                                        $signature = $this->signAsymmetric($clientKey, $timestamp);
                                        $url = rtrim((string) config('doku.base_url'), '/') . '/authorization/v1/access-token/b2b';

                                        $resp = Http::timeout(15)
                                                            ->acceptJson()
                                                            ->asJson()
                                                            ->withHeaders([
                                                                                'X-CLIENT-KEY' => $clientKey,
                                                                                'X-TIMESTAMP' => $timestamp,
                                                                                'X-SIGNATURE' => $signature,
                                                            ])
                                                            ->post($url, [
                                                                                'grantType' => 'client_credentials',
                                                            ]);

                                        if (!$resp->successful()) {
                                                            throw new \RuntimeException('DOKU get token failed: ' . $resp->status() . ' ' . $resp->body());
                                        }

                                        $data = $resp->json();
                                        $token = (string) ($data['accessToken'] ?? '');
                                        if (!$token) {
                                                            throw new \RuntimeException('DOKU get token failed: missing accessToken');
                                        }

                                        $ttl = (int) ($data['expiresIn'] ?? 900);
                                        $cache->put('doku.snap.b2b.token', $token, max(60, $ttl - 60));

                                        return $token;
                    }

                    public function generateQris(array $payload): array
                    {
                                        $token = $this->getB2BAccessToken();
                                        $timestamp = $this->timestamp();
                                        $externalId = $this->externalId();
                                        $path = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
                                        $url = rtrim((string) config('doku.base_url'), '/') . $path;

                                        $body = $this->minifyJson($payload);
                                        $signature = $this->signSymmetric('POST', $path, $token, $body, $timestamp);

                                        $resp = Http::timeout(20)
                                                            ->acceptJson()
                                                            ->withHeaders([
                                                                                'X-PARTNER-ID' => (string) config('doku.partner_id'),
                                                                                'X-EXTERNAL-ID' => $externalId,
                                                                                'X-TIMESTAMP' => $timestamp,
                                                                                'X-SIGNATURE' => $signature,
                                                                                'CHANNEL-ID' => (string) config('doku.channel_id'),
                                                                                'Authorization' => 'Bearer ' . $token,
                                                                                'Content-Type' => 'application/json',
                                                            ])
                                                            ->withBody($body, 'application/json')
                                                            ->post($url);

                                        if (!$resp->successful()) {
                                                            throw new \RuntimeException('DOKU generate QRIS failed: ' . $resp->status() . ' ' . $resp->body());
                                        }

                                        return [
                                                            'external_id' => $externalId,
                                                            'timestamp' => $timestamp,
                                                            'response' => $resp->json(),
                                        ];
                    }

                    public function queryQris(array $payload): array
                    {
                                        $token = $this->getB2BAccessToken();
                                        $timestamp = $this->timestamp();
                                        $externalId = $this->externalId();
                                        $path = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';
                                        $url = rtrim((string) config('doku.base_url'), '/') . $path;

                                        $body = $this->minifyJson($payload);
                                        $signature = $this->signSymmetric('POST', $path, $token, $body, $timestamp);

                                        $resp = Http::timeout(20)
                                                            ->acceptJson()
                                                            ->withHeaders([
                                                                                'X-PARTNER-ID' => (string) config('doku.partner_id'),
                                                                                'X-EXTERNAL-ID' => $externalId,
                                                                                'X-TIMESTAMP' => $timestamp,
                                                                                'X-SIGNATURE' => $signature,
                                                                                'CHANNEL-ID' => (string) config('doku.channel_id'),
                                                                                'Authorization' => 'Bearer ' . $token,
                                                                                'Content-Type' => 'application/json',
                                                            ])
                                                            ->withBody($body, 'application/json')
                                                            ->post($url);

                                        if (!$resp->successful()) {
                                                            throw new \RuntimeException('DOKU query QRIS failed: ' . $resp->status() . ' ' . $resp->body());
                                        }

                                        return [
                                                            'external_id' => $externalId,
                                                            'timestamp' => $timestamp,
                                                            'response' => $resp->json(),
                                        ];
                    }

                    protected function timestamp(): string
                    {
                                        return now('Asia/Jakarta')->format('Y-m-d\\TH:i:sP');
                    }

                    protected function externalId(): string
                    {
                                        return Str::padLeft((string) ((int) (microtime(true) * 1000)), 18, '0') . Str::padLeft((string) random_int(0, 999999), 6, '0');
                    }

                    protected function signAsymmetric(string $clientIdOrKey, string $timestamp): string
                    {
                                        $path = (string) config('doku.private_key_path');
                                        if (!$path || !is_file($path)) {
                                                            throw new \RuntimeException('DOKU private key not found at DOKU_SNAP_PRIVATE_KEY_PATH');
                                        }

                                        $pem = file_get_contents($path);
                                        if ($pem === false) {
                                                            throw new \RuntimeException('DOKU private key read failed');
                                        }

                                        $privateKey = openssl_pkey_get_private($pem);
                                        if (!$privateKey) {
                                                            throw new \RuntimeException('DOKU private key invalid');
                                        }

                                        $stringToSign = $clientIdOrKey . '|' . $timestamp;
                                        $signature = '';
                                        $ok = openssl_sign($stringToSign, $signature, $privateKey, OPENSSL_ALGO_SHA256);
                                        openssl_free_key($privateKey);

                                        if (!$ok) {
                                                            throw new \RuntimeException('DOKU asymmetric signature failed');
                                        }

                                        return base64_encode($signature);
                    }

                    protected function signSymmetric(string $method, string $endpointUrl, string $accessToken, string $minifiedBody, string $timestamp): string
                    {
                                        $clientSecret = (string) config('doku.client_secret');
                                        if (!$clientSecret) {
                                                            throw new \RuntimeException('DOKU client secret missing');
                                        }

                                        $bodyHashHex = strtolower(hash('sha256', $minifiedBody));
                                        $stringToSign = strtoupper($method) . ':' . $endpointUrl . ':' . $accessToken . ':' . $bodyHashHex . ':' . $timestamp;

                                        return base64_encode(hash_hmac('sha512', $stringToSign, $clientSecret, true));
                    }

                    protected function minifyJson(array $payload): string
                    {
                                        return (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }
}
