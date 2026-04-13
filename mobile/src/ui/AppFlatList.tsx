import { forwardRef } from "react";
import { FlatList, type FlatListProps } from "react-native";

const AppFlatList = forwardRef(function AppFlatListInner<T>(
  props: FlatListProps<T>,
  ref: any,
) {
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
});

export default AppFlatList;
