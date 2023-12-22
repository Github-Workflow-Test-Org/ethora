/*
Copyright 2019-2022 (c) Dappros Ltd, registered in England & Wales, registration number 11455432. All rights reserved.
You may not use this file except in compliance with the License.
You may obtain a copy of the License at https://github.com/dappros/ethora/blob/main/LICENSE.
Note: linked open-source libraries and components may be subject to their own licenses.
*/

import { observer } from "mobx-react-lite";
import React, { useEffect, useRef, useState } from "react";
import { useStores } from "../../stores/context";
import { RoomListItem } from "./RoomListItem";
import { View, Text, HStack } from "native-base";
import { Animated, FlatList, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { HomeStackNavigationProp as HomeStackNavigationProperty } from "../../navigation/types";
import { roomListProps as roomListProperties } from "../../stores/chatStore";
import { TouchableOpacity } from "react-native-gesture-handler";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP,
} from "react-native-responsive-screen";
import Icon from "react-native-vector-icons/FontAwesome";
import RoomsCategories from "./RoomsCategories";
import RoomsHeader from "./RoomsHeader";
import { LinearGradient } from "react-native-linear-gradient";

interface IRoomList {
  roomsList: roomListProperties[];
}

export const RoomList: React.FC<IRoomList> = observer(
  (properties: IRoomList) => {
    const { chatStore } = useStores();
    const { roomsList } = properties;
    const sortedRoomsList = roomsList.sort(
      (a: any, b: any) =>
        chatStore.roomsInfoMap[a.jid]?.priority -
        chatStore.roomsInfoMap[b.jid]?.priority
    );
    const [allRooms, setAllRooms] = useState([...chatStore.roomList]);
    const navigation = useNavigation<HomeStackNavigationProperty>();

    const [isFocused, setIsFocused] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [placeholderAnimationEnded, setPlaceholderAnimationEnded] =
      useState(false);
    const handleSearchFocus = () => setIsFocused(true);
    const handleSearchBlur = () => {
      if (!searchValue) setIsFocused(false);
    };
    const inputReference = useRef(null);
    const placeholderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const placeholderMoveAnimation = Animated.timing(placeholderAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      });
      placeholderMoveAnimation.start(({ finished }) => {
        if (finished) {
          setPlaceholderAnimationEnded(isFocused);
        }
      });
      return () => {
        placeholderMoveAnimation.stop();
      };
    }, [isFocused, placeholderAnim]);

    const translateX = placeholderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [widthPercentageToDP("-5%"), widthPercentageToDP("-33%")],
    });

    const handleSearchChange = (value) => {
      setSearchValue(value);
      const newRooms = [...chatStore.roomList];
      setAllRooms(newRooms.filter((room) => room.name.includes(value)));
    };

    const createRoomBlock = (
      <View paddingLeft={4} paddingRight={4} width={"full"}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            width: "100%",
            borderRadius: 25,
            position: "relative",
          }}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                left: "50%",
              },
              { transform: [{ translateX }] },
            ]}
          >
            <Text style={{ color: "#8F8F8F", opacity: searchValue ? 0 : 1 }}>
              Search..
            </Text>

            <Icon
              name="search"
              style={{ position: "absolute", top: 3, left: -22 }}
              size={15}
              color="#888"
            />
          </Animated.View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <TextInput
              ref={inputReference}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onChangeText={handleSearchChange}
              value={searchValue}
              style={{
                paddingLeft: 46,
                width: "100%",
                height: 37,
                paddingRight: 15,
              }}
              caretHidden={!placeholderAnimationEnded}
            />
          </View>
        </View>
        <TouchableOpacity
          style={{
            marginTop: 8,
            marginBottom: 20,
            backgroundColor: "#0052CD",
            height: 37,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 30,
          }}
          onPress={() => navigation.navigate("NewChatScreen")}
        >
          <HStack space={2} alignItems={"center"} justifyContent={"center"}>
            <Icon name="plus" size={9} color="#fff" />
            <Text style={{ color: "#fff" }}>New chat</Text>
          </HStack>
        </TouchableOpacity>
      </View>
    );

    return (
      <>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <LinearGradient
            colors={["#ECF0F4", "#fff"]}
            style={{ width: "100%", position: "relative" }}
          >
            <RoomsHeader style={undefined} />
            <View
              style={{
                paddingTop: 84,
              }}
            >
              {createRoomBlock}
              {!searchValue ? <RoomsCategories /> : null}
            </View>
          </LinearGradient>
          <View
            justifyContent={"center"}
            alignItems={"center"}
            w={"full"}
            flex={1}
          >
            <FlatList
              // ListHeaderComponent={createRoomBlock}
              nestedScrollEnabled={true}
              style={{ width: "100%" }}
              data={searchValue ? allRooms : sortedRoomsList}
              onEndReachedThreshold={0.1}
              keyExtractor={(item: any) => `${item.jid}`}
              renderItem={({ item, index }) => {
                return (
                  <RoomListItem
                    index={index}
                    length={sortedRoomsList.length}
                    counter={item.counter}
                    jid={item.jid}
                    name={item.name}
                    participants={item.participants}
                    key={item.jid}
                  />
                );
              }}
            />
          </View>
        </View>
      </>
    );
  }
);
