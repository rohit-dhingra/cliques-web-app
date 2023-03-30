import {
  onValue,
  ref,
  onChildChanged,
  onChildAdded,
  update,
} from "firebase/database";
import { db } from "hoc/firebase";
import { useState } from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setId } from "redux/auth-reducer";
import {
  setAllGroupsList,
  setAllUserList,
  setInboxDetails,
  updateReecentChat,
  setInboxList,
} from "redux/message-reducer";

var user_id = 125888;

const useMessages = () => {
  const dispatch = useDispatch();
  const { allUserList, inboxDetails, allGroupsList } = useSelector(
    (state) => state.message
  );

  //   Db Refs
  let usersRef = ref(db, "users/");
  let gorupsRef = ref(db, "groups/");

  useEffect(() => {
    handleUserList();
    handleOnlineOfflineStatus("true");
    handleGroupList();
    getAllUserList();
  }, []);

  const getAllUserList = async () => {
    const currentUserId = user_id;
    if (currentUserId) {
      const refURL = `/users/u_${currentUserId}`;

      onValue(ref(db, refURL), async (snapshot) => {
        let data = snapshot.val();
        data.date = new Date();

        dispatch(updateReecentChat());
        dispatch(setInboxDetails(data));
      });
    }
  };

  const handleOnlineOfflineStatus = (status) => {
    update(ref(db, "users/u_" + user_id), {
      onlineStatus: true,
      chat_room_id: "no",
    });
  };

  const handleUserList = () => {
    onValue(usersRef, (snapshot) => {
      const listData = snapshot.val();

      let myList = [];
      Object.keys(listData).forEach(function (key, index) {
        let value = listData[key];
        value.tempId = key;
        myList.push(value);
      });
      // setAllUserList(myList);

      dispatch(setAllUserList(myList));
      onChildAdded(usersRef, (snapshot) => {
        var addedData = {};
        addedData = snapshot.val();
        addedData.tempId = snapshot.key;
        const isAvailable = myList.findIndex(
          (i) => i?.user_id == addedData?.user_id
        );
        if (
          isAvailable == -1 &&
          snapshot.exists() &&
          addedData?.user_id !== undefined
        ) {
          myList = [...myList, addedData];
          dispatch(setAllUserList([...myList, addedData]));
          // setAllUserList([...myList, addedData]);
          dispatch(updateReecentChat());
        }
      });
    });

    onChildChanged(usersRef, (snapshot) => {
      var changedData = {};
      changedData = snapshot.val();
      changedData.tempId = snapshot.key;
      let emptyArray = [];
      let currentUserList = allUserList || [];
      emptyArray = currentUserList.filter(
        (i) => i?.user_id !== changedData?.user_id
      );
      emptyArray = [...emptyArray, changedData];
      // setAllUserList(emptyArray);
      dispatch(setAllUserList(emptyArray));
      dispatch(updateReecentChat());
    });
  };

  const handleGroupList = () => {
    onValue(gorupsRef, (snapshot) => {
      const tempList = snapshot.exists() ? snapshot.val() : {};
      let finalGroupList = [];
      Object.keys(tempList).forEach(function (key, index) {
        let value = tempList[key];
        value.group_id = key;
        finalGroupList.push(value);
      });

      dispatch(setAllGroupsList(finalGroupList));

      onChildAdded(gorupsRef, (snapshot) => {
        var data = {};
        data = snapshot.val();
        data.tempId = snapshot.key;
        const isAvailable = finalGroupList.findIndex(
          (i) => i?.group_id == data?.group_id
        );
        if (isAvailable == -1 && snapshot.exists()) {
          finalGroupList = [...finalGroupList, data];
          dispatch(setAllGroupsList([...finalGroupList, data]));
        }
      });
    });

    onChildChanged(gorupsRef, (snapshot) => {
      const groupChanged = snapshot.val();
      let currentGroupList = allGroupsList || [];
      let emptyArray = [];
      emptyArray = currentGroupList.filter(
        (i) => i?.group_id !== groupChanged?.group_id
      );
      emptyArray = [...emptyArray, groupChanged];
      dispatch(setAllGroupsList(emptyArray));
      dispatch(updateReecentChat());
    });
  };

  useEffect(() => {
    let list = [];
    Object.keys(inboxDetails?.myInbox || {}).forEach(function (key, index) {
      if (key != "undefined") {
        let value = {};
        value = { ...inboxDetails?.myInbox[key], tempId: key };
        list.push(value);
      }
    });
    let myInboxList = [];
    let isAccepted = true;
    for (const obj of list) {
      let userData = {};
      if (obj.type == "group") {
        userData = allGroupsList.filter((i) => i?.group_id == obj?.group_id)[0];
        let tempMemberlist = [];
        let groupName = "";
        const last = Object.keys(userData?.members || {})[
          Object.keys(userData?.members || {}).length - 1
        ];
        const lengthOfUser = Object.keys(userData?.members || {}).length;
        Object.keys(userData?.members || {}).forEach(function (key, index) {
          let userValue = userData?.members[key];
          if (userValue?.user_id == user_id) {
            isAccepted =
              userValue?.hasOwnProperty("isAccepted") && !userValue?.isAccepted
                ? false
                : true;
          }

          const groupuser = allUserList.filter(
            (i) => i?.tempId == `u_${userValue?.user_id}`
          )[0];
          userValue = {
            ...userValue,
            image: groupuser?.image,
            name: groupuser?.name,
          };
          if (userData?.name == "" || userData?.name == undefined) {
            if (lengthOfUser == 2) {
              if (userValue?.user_id !== user_id) {
                groupName = groupuser?.name;
              }
            } else {
              if (userValue?.user_id !== user_id) {
                groupName = groupName.concat(
                  last == key ? `${groupuser?.name}` : `${groupuser?.name},`
                );
              }
            }
          } else {
            groupName = userData?.name;
          }

          tempMemberlist.push(userValue);
        });

        const inbox = inboxDetails?.myInbox;
        const myInbox = inbox[obj?.group_id];
        userData = {
          ...userData,
          membersList: tempMemberlist,
          count: myInbox?.count || 0,
          lastMsg:
            !isAccepted && myInbox?.lastMsg
              ? "New Messages"
              : myInbox?.lastMsg || "",
          name: groupName,
        };

        if (myInbox?.lastMsgTime) {
          userData["lastMsgTime"] = myInbox?.lastMsgTime;
        }
      } else {
        userData = allUserList?.filter((i) => {
          return i?.tempId == obj?.tempId;
        })[0];
      }
      const finalObj = {
        ...obj,
        ...userData,
        key: `${obj.type == "group" ? obj?.group_id : obj?.user_id}`,
      };
      myInboxList.push(finalObj);
    }
    myInboxList = myInboxList.filter((e) => {
      if (e?.user_id && e?.user_id !== user_id) {
        return e;
      } else if (e?.group_id) {
        return e;
      }
    });

    console.log({ myInboxList });
    dispatch(
      setInboxList(
        myInboxList.sort((x, y) => y.lastMsgTime - x.lastMsgTime) || []
      )
    );
  }, [allUserList, inboxDetails, allGroupsList]);

  return {};
};

export default useMessages;
