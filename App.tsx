import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function immutableMove(arr, from, to) {
  return arr.reduce((prev, current, idx, self) => {
    if (from === to) {
      prev.push(current);
    }
    if (idx === from) {
      return prev;
    }
    if (from < to) {
      prev.push(current);
    }
    if (idx === to) {
      prev.push(self[from]);
    }
    if (from > to) {
      prev.push(current);
    }
    return prev;
  }, []);
}

const colorMap = {};
let currentY = 0;
let scrollOffset = 0;
let flatListTopOffset = 0;
let rowHeight = 0;
let currentIdx = -1;
let active = false;
let flatListHeight = 0;

export default () => {
  const [dragging, setDragging] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState(-1);
  const [data, setData] = useState(() =>
    Array.from(Array(200), (_, i) => {
      colorMap[i] = getRandomColor();
      return i;
    }),
  );

  const flatList = useRef<FlatList>();
  const point = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt, gestureState) => {
        // The gesture has started. Show visual feedback so the user knows
        // what is happening!
        // gestureState.d{x,y} will be set to zero now
        currentIdx = yToIndex(gestureState.y0);
        currentY = gestureState.y0;
        Animated.event([{ y: point.y }], { useNativeDriver: false })({
          y: gestureState.y0 - rowHeight / 2,
        });
        active = true;
        setDragging(true);
        setDraggingIdx(currentIdx);
      },
      onPanResponderMove: (evt, gestureState) => {
        currentY = gestureState.moveY;
        Animated.event([null, { moveY: point.y }], { useNativeDriver: false })(evt, gestureState);
        // The most recent move distance is gestureState.move{X,Y}
        // The accumulated gesture distance since becoming responder is
        // gestureState.d{x,y}
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => {
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
        reset();
      },
      onPanResponderTerminate: () => {
        // Another component has become the responder, so this gesture
        // should be cancelled
        reset();
      },
      onShouldBlockNativeResponder: () => {
        // Returns whether this component should block native components from becoming the JS
        // responder. Returns true by default. Is currently only supported on android.
        return true;
      },
    }),
  ).current;

  useEffect(() => {
    animateList();
  }, [dragging]);

  const animateList = () => {
    if (!active) {
      return;
    }

    requestAnimationFrame(() => {
      // check if we are near the bottom or top
      if (currentY + 100 > flatListHeight) {
        flatList.current.scrollToOffset({
          offset: scrollOffset + 20,
          animated: false,
        });
      } else if (currentY < 100) {
        flatList.current.scrollToOffset({
          offset: scrollOffset - 20,
          animated: false,
        });
      }

      // check y value see if we need to reorder
      const newIdx = yToIndex(currentY);
      if (currentIdx !== newIdx) {
        setData((oldData) => immutableMove(oldData, currentIdx, newIdx));
        setDraggingIdx(newIdx);
        currentIdx = newIdx;
      }

      animateList();
    });
  };

  const yToIndex = (y: number) => {
    const value = Math.floor(
      (scrollOffset + y - flatListTopOffset) / rowHeight,
    );

    if (value < 0) {
      return 0;
    }

    if (value > data.length - 1) {
      return data.length - 1;
    }

    return value;
  };

  const reset = () => {
    active = false;
    setDragging(false);
    setDraggingIdx(-1);
  };

  const renderItem = ({ item, index }, noPanResponder = false) => (
    <View
      onLayout={e => {
        rowHeight = e.nativeEvent.layout.height;
      }}
      style={{
        padding: 16,
        backgroundColor: colorMap[item],
        flexDirection: "row",
        opacity: draggingIdx === index ? 0 : 1,
      }}
    >
      <View {...(noPanResponder ? {} : panResponder.panHandlers)}>
        <Text style={{ fontSize: 28 }}>@</Text>
      </View>
      <Text style={{ fontSize: 22, textAlign: "center", flex: 1 }}>
        {item}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {dragging && (
        <Animated.View
          style={{
            position: "absolute",
            backgroundColor: "black",
            zIndex: 2,
            width: "100%",
            top: point.y,
          }}
        >
          {renderItem({ item: data[draggingIdx], index: -1 }, true)}
        </Animated.View>
      )}
      <FlatList
        ref={flatList}
        scrollEnabled={!dragging}
        style={{ width: "100%" }}
        data={data}
        renderItem={renderItem}
        onScroll={e => {
          scrollOffset = e.nativeEvent.contentOffset.y;
        }}
        onLayout={e => {
          flatListTopOffset = e.nativeEvent.layout.y;
          flatListHeight = e.nativeEvent.layout.height;
        }}
        scrollEventThrottle={16}
        keyExtractor={item => "" + item}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  }
});
