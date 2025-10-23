// const { Socket } = require("socket.io");
const Models = require("../models/index");
const helper = require("../helpers/commonHelper");
const { Op, Sequelize } = require("sequelize");
Models.messageModel.belongsTo(Models.userModel, { foreignKey: 'senderId', as: 'sender' });
Models.messageModel.belongsTo(Models.userModel, { foreignKey: 'receiverId', as: 'receiver' });
Models.chatConstantModel.belongsTo(Models.userModel, { foreignKey: 'senderId', as: 'sender' });
Models.chatConstantModel.belongsTo(Models.userModel, { foreignKey: 'receiverId', as: 'receiver' });
Models.chatConstantModel.belongsTo(Models.messageModel, { foreignKey: 'lastMessageId', as: 'lastMessageIds' });

module.exports = function (io) {
  console.log("Inside the socket");
  io.on("connection", (socket) => {
    // http://192.168.1.210:4848/ when from forntend side start on it give this url instead of localhost give ipV4
    console.log("connected user", socket.id); //This will check request is https or http if it's value is true that's means requrest is https(scure)
    //or if it is false that mean's it is http(not scure).
    console.log("socket.handshake.secure", socket.handshake.secure);
    //This return IP with port
    console.log("socket.handshake.headers.host", socket.handshake.headers.host);
    // console.log("socket",socket)
    //Connect the user  //Test pass
    socket.on("connect_user", async function (data) {
      try {
        console.log("data", data);
        if (!data.userId) {
          error_message = {
            error_message: "please enter user id first",
          };
          socket.emit("connect_user_listener", error_message);
          return;
        }
        const socketId = socket.id;
  
        await Models.userModel.update(
            { isOnline: 1, socketId: socketId },
            {
              where: { id: data.userId },
            }
          );
        let success_msg = {
          success_msg: "connected successfully",
        };
        socket.emit("connect_user_listener", success_msg);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
    //Test pass
    //On click user seen the all message of user one to one after click on user then seen all chat of one user //Test pass
    socket.on("users_chat_list", async (get_data) => {
      try {
        const findConstant = await Models.chatConstantModel.findOne({
          where: {
            [Op.or]: [
              {
                senderId: get_data.senderId,
                receiverId: get_data.receiverId,
              },
              {
                senderId: get_data.receiverId,
                receiverId: get_data.senderId,
              },
            ],
          },
          include: [
            {
              model: Models.userModel,
              as: "sender",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "profilePicture",
                "email",
              ],
            },
            {
              model: Models.userModel,
              as: "receiver",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "profilePicture",
                "email",
              ],
            },
          ],
        });

        if (findConstant) {
          await Models.messageModel.update(
            { readStatus: 1 }, // Values to update
            {
              where: {
                senderId: get_data.receiverId,
                receiverId: get_data.senderId,
                readStatus: 0, // Additional condition for updating
              },
            }
          );

          const chatList = await Models.messageModel.findAll({
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    {
                      senderId: get_data.senderId,
                      receiverId: get_data.receiverId,
                    },
                    {
                      receiverId: get_data.senderId,
                      senderId: get_data.receiverId,
                    },
                  ],
                },
                {
                  [Op.or]: [
                    { deletedId: null }, // message not deleted by anyone
                    { deletedId: { [Op.ne]: get_data.senderId } } // or deleted by someone else but not this sender
                  ],
                },
              ],
            },
            include: [
              {
                model: Models.userModel,
                as: "sender",
                attributes: ["id", "firstName", "lastName", "profilePicture"],
              },
              {
                model: Models.userModel,
                as: "receiver",
                attributes: ["id", "firstName", "lastName", "profilePicture"],
              },
            ],
            order: [["createdAt", "ASC"]], // Optional: sort by message time
          });
          
          // Populate receiver's profile profilePicture;
          const count = await Models.messageModel.count({
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { senderId: get_data.senderId },
                        { receiverId: get_data.receiverId },
                      ],
                    },
                    {
                      [Op.and]: [
                        { receiverId: get_data.senderId },
                        { senderId: get_data.receiverId },
                      ],
                    },
                  ],
                },
                {
                  [Op.and]: [
                    { deletedId: { [Op.ne]: get_data.senderId } },
                    { readStatus: 0 },
                  ],
                },
              ],
            },
          });

          const success_message = {
            success_message: "Users Chats",
            code: 200,
            senderDetail: findConstant,
            // unread_message_count: count,
            getdata: chatList.map((message) => {
              const isMessageFromSender = message.senderId == get_data.senderId;

              return {
                id: message.id,
                senderId: message.senderId,
                receiverId: message.receiverId,
                sender: message.sender,
                receiver: message.receiver,
                // chatConstantId: message.chatConstantId,
                message: message.message,
                readStatus: message.readStatus,
                messageType: message.messageType,
                thumbnail: message.thumbnail,
                deletedId: message.deletedId,
                profilePicture: message.profilePicture,
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
                messageside: isMessageFromSender ? "sender" : "other",
              };
            }),
          };

          socket.emit("users_chat_list_listener", success_message);
        } else {
          const success_message = {
            error: "Users Chat not found",
            code: 403,
          };
          socket.emit("users_chat_list_listener", success_message);
        }
      } catch (error) {
        throw error;
      }
    });
    //Test pass
    //List of all user with whom sender-User do chat with online status
    socket.on("user_constant_list", async (get_data) => {
      try {
        const { filter, senderId } = get_data;
        // Build the query to find chat constants
        const where = {
          [Op.or]: [{ senderId: senderId }, { receiverId: senderId }],
        };
        // Find all chat constants that match the criteria
        const constantList = await Models.chatConstantModel.findAll({
          where: where,
          include: [
            {
              model: Models.messageModel,
              as: "lastMessageIds",
              attributes: ["message", "messageType"],
            },
            {
              model: Models.userModel,
              as: "sender",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "profilePicture",
                "email",
              ],
            },
            {
              model: Models.userModel,
              as: "receiver",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "profilePicture",
                "email",
              ],
            },
          ],
          order: [["updatedAt", "DESC"]],
        });

        // Create an array to store user IDs for whom we want to count unread message
        const userIds = constantList.map((constant) => {
          if (constant.senderId && constant.senderId == senderId) {
            return constant.receiverId != null ? constant.receiverId : null;
          } else {
            return constant.senderId != null ? constant.senderId : null;
          }
        });
        // Initialize an empty object to store unread message counts
        const unreadMessageCounts = {};
        // Loop through each user ID and count unread message

        for (const userId of userIds) {
          const count = await Models.messageModel.count({
            where: {
              [Op.and]: {
                [Op.or]: [
                  // { senderId: senderId ,receiverId: userId},
                  { senderId: userId, receiverId: senderId },
                ],
                readStatus: 0,
              },
            },
          });
          unreadMessageCounts[userId] = count;
          console.log(
            " unreadMessageCounts[userId]",
            (unreadMessageCounts[userId] = count)
          );
        }

        const allSocketUsers = await Models.userModel.findAll({
          where: {
            id: {
              [Op.ne]: get_data.senderId, // Exclude the get_data.senderId
            },
          },
        });

        // Create an object to map user IDs to their online status
        const onlineStatusMap = {};
        allSocketUsers.forEach((user) => {
          onlineStatusMap[user.userId] = user.isOnline == 1; // Set isOnline based on the value
        });
        const uniqueGetdata = constantList.filter((value, index, self) => {
          // Find the index of the first occurrence of the same senderId and receiverId
          const firstIndex = self.findIndex(
            (item) =>
              item.senderId === value.senderId &&
              item.receiverId === value.receiverId
          );
          // Keep only the first occurrence
          return index === firstIndex;
        });

        // Add unread message counts to the constantList
        uniqueGetdata.forEach((constant) => {
          const senderId = constant.senderId;
          const receiverId = constant.receiverId;          
          // Determine the user ID for whom you want to count unread message
          const userId = senderId == get_data.senderId ? receiverId : senderId;
          // Check if the user ID is valid and exists in unreadMessageCounts
          if (userId !== null && unreadMessageCounts[userId] !== undefined) {
            // Add the unreadCount property to the object
            constant.dataValues.unreadCount = unreadMessageCounts[userId];
          } else {
            // Handle the case where unreadMessageCounts doesn't have data for this user
            constant.dataValues.unreadCount = 0;
          }
          if (userId !== null && onlineStatusMap[userId]) {
            constant.dataValues.onlineStatus = true; // User is online
          } else {
            constant.dataValues.onlineStatus = false; // User is offline
          }
          
          if (
            constant.dataValues.deletedId == get_data.senderId &&
            constant.dataValues.deletedLastMessageId != 0
          ) {
            constant.dataValues.lastMessageId = "";
            constant.lastMessageIds
              ? (constant.lastMessageIds.message = "")
              : "";
          }
        });

        const success_message = {
          success_message: "User Constant Chats List with Unread Message Count",
          code: 200,
          getdata: uniqueGetdata,
        };

        socket.emit("user_constant_chat_list", success_message);
      } catch (error) {
        throw error;
      }
    });
    //Disconnect the user //Test pass
    socket.on("disconnect_user", async (connect_listener) => {
      try {
        const socketid = socket.id;
        const check_user = await Models.userModel.findOne({
          where: {
            id: connect_listener.userId, // The condition to find the socket user with a specific userId
          },
        });
        if (check_user) {
          await Models.userModel.update(
            { isOnline: 0 }, // Values to update
            {
              where: {
                id: connect_listener.userId, // Your condition for updating
              },
            }
          );
        }
        const success_message = {
          success_message: "Disconnect successfully",
          socketid,
        };
        socket.emit("disconnect_listener", success_message);
      } catch (error) {
        throw error;
      }
    });
    //When user close the tab or app or when the server is shutdown so auto disconnet the user on server side
    socket.on("disconnect", async function () {
      try {
        await Models.userModel.update(
          {
            isOnline: 0,
          },
          {
            where: {
              socketId: socket.id,
            },
          }
        );
      } catch (error) {
        return error;
      }
    });
    //Message read and unread //Test pass
    socket.on("read_unread", async function (get_read_status) {
      try {
        await Models.messageModel.update(
          { readStatus: 1 }, // Values to update
          {
            where: {
              [Op.or]: [
                {
                  senderId: get_read_status.receiverId,
                  receiverId: get_read_status.senderId,
                  readStatus: 0,
                },
              ],
            },
          }
        );
        const senderDetail = await Models.userModel.findOne({
          where: { id: get_read_status.senderId },
        });
        const receiverDetail = await Models.userModel.findOne({
          where: { id: get_read_status.receiverId },
        });

        const get_read_unread = { readStatus: 1 };
        io.to(senderDetail.socketId).emit(
          "read_unread_listner",
          get_read_status
        );
        io.to(receiverDetail.socketId).emit(
          "read_unread_listner",
          get_read_status
        );
        // socket.emit("read_unread_listner", get_read_status);
      } catch (error) {
        throw error;
      }
    });
    //Delete the message //test pass
    socket.on("delete_message", async (get_data) => {
      try {
        console.log("getdata", get_data);
          // It's a single ID
          const deleteMessage = await Models.messageModel.destroy({
            where: {
              id: get_data.messageId, // Replace with the actual field name for the message ID
            },
          });
          //Find last message
          let lastMessageIds = await Models.chatConstantModel.findOne({
            where: {
              [Op.or]: [
                {
                  senderId: get_data.senderId,
                  lastMessageId: get_data.messageId,
                },
                {
                  receiverId: get_data.senderId,
                  lastMessageId: get_data.messageId,
                },
              ],
            },
          });

          if (lastMessageIds) {
            //Then find last message
            const data = await Models.messageModel.findOne({
              where: {
                [Op.or]: [
                  {
                    senderId: lastMessageIds.senderId,
                    receiverId: lastMessageIds.receiverId,
                  },
                  {
                    senderId: lastMessageIds.receiverId,
                    receiverId: lastMessageIds.senderId,
                  },
                ],
              },
              order: [["createdAt", "DESC"]], // Sorting by the 'createdAt' field in descending order
            });

            //Then store last message in chatConstant
            await Models.chatConstantModel.update(
              { lastMessageId: data.dataValues.id },
              {
                where: {
                  id: lastMessageIds.dataValues.id,
                },
              }
            );
          }
        // Send success response to the client
        const success_message = {
          success_message: "Message deleted successfully",
        };
        socket.emit("delete_message_listener", success_message);
      } catch (error) {
        throw error;
      }
    });
    //Message send //Test pass
    socket.on("send_message", async function (data) {
      try {
        // Check if a chat constant exists for these users
        // console.log("data", data);
        const checkChatConstant = await Models.chatConstantModel.findOne({
          where: {
            [Op.or]: [
              {
                senderId: data.senderId,
                receiverId: data.receiverId,
              },
              {
                senderId: data.receiverId,
                receiverId: data.senderId,
              },
            ],
          },
        });

        if (checkChatConstant) {
          // Create a new message and associate it with the chat constant
          const saveMsg = await Models.messageModel.create({
            senderId: data.senderId,
            receiverId: data.receiverId,
            message: data.message,
            messageType: data.messageType,
            // chatConstantId: checkChatConstant.id,
            thumbnail:
              data.messageType == 2 || data.messageType == 3
                ? data.thumbnail
                : "",
          });
          // Update the last message ID in the chat constant
          let updatedata = await Models.chatConstantModel.update(
            {
              lastMessageId: saveMsg.id,
              deletedLastMessageId: 0,
            },
            {
              where: {
                id: checkChatConstant.id,
              },
            }
          );
          console.log("updatedata", updatedata);

          // Retrieve the message and sender/receiver information
          const getMsg = await Models.messageModel.findOne({
            where: {
              senderId: saveMsg.senderId,
              receiverId: saveMsg.receiverId,
              id: saveMsg.id,
            },
            include: [
              {
                model: Models.userModel,
                as: "sender",
              },
              {
                model: Models.userModel,
                as: "receiver",
              }
            ],
          });

          // Emit the message to the sender's and receiver's sockets
          if (getMsg) {
            const getMsgs = getMsg;
            const getSocketId = await Models.userModel.findOne({
              where: {
                id: data.receiverId,
              },
            });

            if (getSocketId) {
              io.to(getSocketId.socketId).emit("send_message_emit", getMsgs);
            }

            // Send push notification to the receiver if available
            const user = await Models.userModel.findOne({
              where: {
                id: data.receiverId,
              },
            });

            if (
              user &&
              user.deviceToken &&
              user.userInChatRoom != data.senderId
            ) {
              let body = {
                deviceToken: user.deviceToken,
                deviceType: user.deviceType,
                message: getMsg.message,
                notificationType: 1,
                senderDetail: getMsg.sender,
                senderId: getMsg.sender.id,
                senderName: getMsg.sender.name,
                receiverId: getMsg.receiverId ? getMsg.receiverId.id : "",
                messageType: getMsg.messageType,
                data: data,
              };
              let senderDetail=await Models.userModel.findOne({
                where:{
                  id:data.senderId
                },raw:true
              })
              let objToSend={
                senderId:String(data.senderId),
                receiverId:String(data.receiverId),
                // message:`${senderDetail.firstName} ${senderDetail.lastName} send you a message` ,
                message:String(data.message),
                // title:`${senderDetail.firstName} ${senderDetail.lastName} send you a message` ,
                title: 'Edify',
                keyId:String(getMsg.id)
              }
              let type="12"
              await helper.sendFirebasePush(user.deviceToken,objToSend,type,user.deviceType);
            }

            // Emit the message to the sender's socket
            socket.emit("send_message_emit", getMsgs);
          }
        } else {
          // Create a new chat constant
          const createChatConstant = await Models.chatConstantModel.create({
            senderId: data.senderId,
            receiverId: data.receiverId,
            lastMessageId:null
          });
          // Create a new message and associate it with the chat constant
          const saveMsg = await Models.messageModel.create({
            senderId: data.senderId,
            receiverId: data.receiverId,
            message: data.message,
            messageType: data.messageType,
            // chatConstantId: createChatConstant.id,
            thumbnail:
              data.messageType == 2 || data.messageType == 3
                ? data.thumbnail
                : "",
          });

          // Update the last message ID in the chat constant
          await Models.chatConstantModel.update(
            {
              lastMessageId: saveMsg.id,
              deletedLastMessageId: 0,
            },
            {
              where: {
                id: createChatConstant.id,
              },
            }
          );

          // Retrieve the message and sender/receiver information
          const getMsg = await Models.messageModel.findOne({
            where: {
              senderId: saveMsg.senderId,
              receiverId: saveMsg.receiverId,
              id: saveMsg.id,
            },
            include: [
              {
                model: Models.userModel,
                as: "sender",
              },
              {
                model: Models.userModel,
                as: "receiver",
              },
            ],
          });

          // Emit the message to the sender's and receiver's sockets
          if (getMsg) {
            const getMsgs = getMsg;
            const getSocketId = await Models.userModel.findOne({
              where: {
                id: data.receiverId,
              },
            });

            if (getSocketId) {
              io.to(getSocketId.socketId).emit("send_message_emit", getMsgs);
            }

            // Send push notification to the receiver if available
            const user = await Models.userModel.findOne({
              where: {
                id: data.receiverId,
              },
            });

            if (
              user &&
              user.deviceToken &&
              user.userInChatRoom != data.senderId
            ) {
              const deviceToken = user.deviceToken;
              const deviceType = user.deviceType;

              let body = {
                deviceToken: user.deviceToken,
                deviceType: user.deviceType,
                message: getMsg.message,
                notificationType: 1,
                senderDetail: getMsg.sender,
                senderId: getMsg.sender.id,
                senderName: getMsg.sender.name,
                receiverId: getMsg.receiverId ? getMsg.receiverId.id : "",
                messageType: getMsg.messageType,
                data: data,
              };
              let senderDetail=await Models.userModel.findOne({
                where:{
                  id:data.senderId
                },raw:true
              })
              let objToSend={
                senderId:String(data.senderId),
                receiverId:String(data.receiverId),
                // message:`${senderDetail.firstName} ${senderDetail.lastName} send you a message` ,
                message:String(data.message),
                // title:`${senderDetail.firstName} ${senderDetail.lastName} send you a message` ,
                title: 'Edify',
                keyId:String(getMsg.id)
              }
              let type="12"
              await helper.sendFirebasePush(user.deviceToken,objToSend,type,deviceType);

            }

            // Emit the message to the sender's socket
            socket.emit("send_message_emit", getMsgs);
          }
        }
      } catch (error) {
        throw error;
      }
    });
    socket.on("clear_chat", async (get_data) => {
      try {
        // Find all message to be cleared
        const getmessage = await Models.messageModel.findAll({
          where: {
            [Op.or]: [
              {
                senderId: get_data.receiverId,
                receiverId: get_data.senderId,
              },
              {
                senderId: get_data.senderId,
                receiverId: get_data.receiverId,
              },
            ],
            deletedId: {
              [Op.not]: null, // Select message with a non-null deletedId
            },
          },
        });

        if (getmessage && getmessage.length > 0) {
          console.log("insideIf");
          
          // Delete message permanently if they have a non-null deletedId
          await Models.messageModel.destroy({
            where: {
              [Op.or]: [
                {
                  senderId: get_data.receiverId,
                  receiverId: get_data.senderId,
                },
                {
                  senderId: get_data.senderId,
                  receiverId: get_data.receiverId,
                },
              ],
              deletedId: {
                [Op.not]: get_data.senderId, // Select message with a non-null deletedId
              },
            },
          });
          await Models.chatConstantModel.update(
            { deletedId: get_data.senderId, deletedLastMessageId: 1 },
            {
              where: {
                [Op.or]: [
                  {
                    senderId: get_data.receiverId,
                    receiverId: get_data.senderId,
                  },
                  {
                    senderId: get_data.senderId,
                    receiverId: get_data.receiverId,
                  },
                ],
              },
            }
          );
        } else {
          console.log("insideElse");

          // Update or add new message with the current sender's deletedId
          await Models.messageModel.update(
            { deletedId: get_data.senderId },
            {
              where: {
                [Op.or]: [
                  {
                    senderId: get_data.receiverId,
                    receiverId: get_data.senderId,
                  },
                  {
                    senderId: get_data.senderId,
                    receiverId: get_data.receiverId,
                  },
                ],
                deletedId: {
                  [Op.eq]: null, // Select message with a non-null deletedId
                },
              },
            }
          );
          await Models.chatConstantModel.update(
            { deletedId: get_data.senderId, deletedLastMessageId: 1 },
            {
              where: {
                [Op.or]: [
                  {
                    senderId: get_data.receiverId,
                    receiverId: get_data.senderId,
                  },
                  {
                    senderId: get_data.senderId,
                    receiverId: get_data.receiverId,
                  },
                ],
              },
            }
          );
        }

        // Send success response to the client
        const success_message = {
          success_message: "message cleared successfully",
        };
        socket.emit("clear_chat_listener", success_message);
      } catch (error) {
        console.error("Error clearing chat:", error);
        // Handle the error here or rethrow it if you want to propagate it further
        throw error;
      }
    });
    //Typing and stopTyping  get_data has senderId and receiverId
    socket.on("typing", async (data) => {
      try {
        const { senderId, receiverId } = data;
        const getSocketId = await Models.userModel.findOne({
          where: {
            id: data.receiverId,
          },
        });
        // Broadcast typing event to the receiver
        io.to(getSocketId.socketId).emit("typing", senderId);
      } catch (error) {
        throw error;
      }
    });
    // Listen for stopTyping event
    socket.on("stopTyping", async (data) => {
      try {
        const { senderId, receiverId } = data;
        const getSocketId = await Models.userModel.findOne({
          where: {
            id: data.receiverId,
          },
        });
        // Broadcast stopTyping event to the receiver
        io.to(getSocketId.socketId).emit("stopTyping", senderId);
      } catch (error) {
        throw error;
      }
    }); 
  });
};

// Backend listerner - emmiter ===1.(connect_user,connect_user_listener (send keys -- userId)), for connect user. 2.(users_chat_list,users_chat_list_listener (send key to backend--- senderId,receiverId)), for seen single user all messsage
// 3.(user_constant_list,user_constant_chat_list (send Key to backend----senderId)),List of all user with whom sender-User do chat. 4(disconnect_user,disconnect_listener (send Key to backend----senderId)),for discount the user
// 5.(read_unread,read_data_status) for read or unread the message. 6 .(delete_message,delete_message_listener) delete permanetly message
// 7.(send_message,send_message_emit,(send Key to backend----senderId,receiverId,message,message_type)) for send the message. 8.(clear_chat,clear_chat_listener) for clear the chat senderId and receiverId. 9.(block_user,block_user_listener) for block the user
// 10.(typing,typing) for typing. 11.(stopTyping,stopTyping) for stop typing.
// soket emit and listner
