import { forwardRef, type ReactElement } from "react";
import { FlatList, type FlatListProps } from "react-native";

function AppFlatListInner<T>(props: FlatListProps<T>, ref: any) {
  const {
    showsVerticalScrollIndicator = false,
    showsHorizontalScrollIndicator = false,
    ...rest
  } = props;
  return (
    <FlatList
      ref={ref}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      {...rest}
    />
  );
}

const AppFlatList = forwardRef(AppFlatListInner) as <T>(
  props: FlatListProps<T> & { ref?: any },
) => ReactElement;

export default AppFlatList;
