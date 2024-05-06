import xmpp from "@xmpp/client";
import { Element } from "ltx";

import { useChatStore } from "../store_";
import { MessageType } from "../store_/chat";

const xml = xmpp.xml;


export const wsClient = {
  client: null,
  host: '',
  coference: '',

  init(service: string, username: string, password: string) {
    this.host = service.match(/wss:\/\/([^:/]+)/)[1]
    this.conference = `conference.${this.host}`
    this.username = username
    this.service = service

    this.client = xmpp.client({
      service: service,
      username: username,
      password: password,
    })
  },

  async connect() {
    return new Promise((resolve, reject) => {
      if (this.client) {
        this.client.on("online", (jid) => {
          console.log("xmpp on online")
          console.log(jid.toString())
          this.client.send(xml("presence"))
          resolve(jid)
        })
        this.client.on("connect", () => console.log("=-> xmpp on connect"))
        this.client.on("close", () => console.log("=-> xmpp client on close"))
        this.client.on("disconnect", () => console.log("=-> xmpp client on disconnect"))
        this.client.on("error", reject)
        this.client.on("error", () => {
          useChatStore.getState().setXmppStatus("error")
        })
        this.client.on("offlien", () => console.log("=-> on offline"))

        this.client.on("status", (status) => console.log("=-> on status ", status))

        this.client.on("stanza", this.realTimeHandler.bind(this))

        this.client.start()
      } else {
        reject(new Error("Client is not initialized"))
      }
    })
  },

  stop() {
    if (this.client) {
      this.client.stop()
    }
  },

  realTimeHandler(stanza: Element) {
    if (stanza.is("message") && stanza.attrs["type"] === 'groupchat') {
      const msg = stanza
      const text = msg.getChild('body')?.getText()
      const attrs = msg.getChild('data')?.attrs
      const archived = msg.getChild('archived')

      if (text && attrs) {
        let parsedEl: any = {}

        parsedEl.text = text
        parsedEl.from = msg.attrs.from
        parsedEl.id = archived.attrs.id
        parsedEl.created = parsedEl.id.slice(0, 13)
        parsedEl.isMe = this.isMe(parsedEl.from)


        for (const [key, value] of Object.entries(attrs)) {
          parsedEl[key] = value
        }

        if (parsedEl.isReply === "true" && !parsedEl.mainMessage) {
          return
        }

        if (parsedEl.mainMessage) {
          try {
            parsedEl.mainMessage = JSON.parse(parsedEl.mainMessage)
          } catch (e) {
            // ignore message if mainMessage is not parsable
            return;
          }
        }

        if (parsedEl.mainMessage) {
          // useChatStore.getState().setThreadMessages([parsedEl])

          useChatStore.getState().setNewThreadMessage(parsedEl)

          if (parsedEl.mainMessage && parsedEl.showInChannel === "true") {
            useChatStore.getState().addNewMessage(parsedEl.from.split("/")[0], parsedEl)
          }
        } else {
          useChatStore.getState().addNewMessage(parsedEl.from.split("/")[0], parsedEl)
        }
      }
    }
  },

  leaveTheRoom(room: string) {
    const presence = xml("presence", {
      to: room + "/" + this.client.jid?.getLocal(),
      type: "unavailable",
    })
    this.client.send(presence)
  },

  presence(rooms: string[]) {
    rooms
      .map((el) => `${el}/${this.client.jid?.getLocal()}`)
      .forEach((to) => {
        this.client.send(
          xml(
            "presence",
            {
              from: this.client.jid?.toString(),
              to
            },
            xml("x", "http://jabber.org/protocol/muc")
          )
        )
      })
  },

  setOwner(to: string) {
    const message = xml(
      "iq",
      {
        to: to,
        id: "setOwner",
        type: "set",
      },
      xml("query", { xmlns: "http://jabber.org/protocol/muc#owner" })
    )

    this.client.send(message)
  },

  roomConfig(to: string, data: { roomName: string; roomDescription?: string }) {
    const message = xml(
      "iq",
      {
        id: "roomConfig",
        to: to,
        type: "set",
      },
      xml(
        "query",
        { xmlns: "http://jabber.org/protocol/muc#owner" },
        xml(
          "x",
          { xmlns: "jabber:x:data", type: "submit" },
          xml(
            "field",
            { var: "FORM_TYPE" },
            xml("value", {}, "http://jabber.org/protocol/muc#roomconfig")
          ),
          xml(
            "field",
            { var: "muc#roomconfig_roomname" },
            xml("value", {}, data.roomName)
          ),
          xml(
            "field",
            { var: "muc#roomconfig_roomdesc" },
            xml("value", {}, data.roomDescription)
          )
        )
      )
    )

    this.client.send(message)
  },

  setRoomIcon(to: string, roomIconUrl: string) {
    const message = xml(
      "iq",
      {
        from: this.client.jid?.toString(),
        id: "setRoomImage",
        type: "set",
      },
      xml("query", {
        xmlns: "ns:getrooms:setprofile",
        room_thumbnail: roomIconUrl,
        room_background: "",
        room: to
      })
    )
    this.client.send(message)
  },

  async getRooms(): Promise<Array<{ name: string, users_cnt: string, room_background: string, room_thumbnail: string, jid: string }> | null> {
    const id = `get-rooms:${Date.now().toString()}`

    let stanzaHdlrPointer;

    const unsubscribe = () => {
      this.client.off('stanza', stanzaHdlrPointer)
    }

    const responsePromise = new Promise((resolve, reject) => {
      stanzaHdlrPointer = (stanza) => {
        if (stanza.is("iq") && stanza.attrs.id === id && stanza.attrs.type === "result") {
          const fields = stanza.getChild('query')?.getChildren('room')

          const response = fields.map((el: Element) => {
            const { name, users_cnt, room_background, room_thumbnail, jid } = el.attrs
            return {
              name, users_cnt, room_background, room_thumbnail, jid
            }
          })
          unsubscribe()
          resolve(response)
        }

        if (stanza.is("iq") && stanza.attrs.id === id && stanza.attrs.type === "error") {
          unsubscribe()
          reject()
        }
      }

      this.client?.on("stanza", stanzaHdlrPointer);

      const message = xml(
        "iq",
        {
          type: "get",
          id: id,
        },
        xml("query", { xmlns: "ns:getrooms" })
      )

      this.client.send(message)
    })

    const timeoutPromise = createTimeoutPromise(10_000, unsubscribe)

    try {
      const res = await Promise.race([responsePromise, timeoutPromise]);
      return res as Array<{ name: string, users_cnt: string, room_background: string, room_thumbnail: string, jid: string }>
    } catch (e) {
      return null
    }
  },

  isMe(from: string) {
    return from.endsWith(this.client.jid.getLocal())
  },

  async getHistory(room: string, max: number, before?: number): Promise<MessageType[]> {
    const id = `get-history:${Date.now().toString()}`

    let stanzaHdlrPointer;

    const unsubscribe = () => {
      this.client.off('stanza', stanzaHdlrPointer)
    }

    const responsePromise = new Promise((resolve, reject) => {
      let messages: Element[] = []

      stanzaHdlrPointer = (stanza) => {
        const result = stanza.getChild('result')

        if (stanza.is('message') && stanza.attrs['from'] && stanza.attrs['from'].startsWith(room) && result) {
          const messageEl = result.getChild('forwarded')?.getChild('message')
          messages.push(messageEl)
        }

        if (stanza.is('iq') && stanza.attrs['id'] === id && stanza.attrs['type'] === 'result') {
          let mainMessages: Record<string, string>[] = []

          for (const msg of messages) {
            const text = msg.getChild('body')?.getText()
            if (text) {
              let parsedEl: Record<string, string> = {}

              parsedEl.text = text
              parsedEl.from = msg.attrs['from']
              parsedEl.id = msg.getChild('archived')?.attrs['id']
              parsedEl.created = parsedEl.id.slice(0, 13)
              parsedEl.isMe = this.isMe(parsedEl.from)
              const data = msg.getChild('data')

              if (!data || !data.attrs) {
                continue
              }

              for (const [key, value] of Object.entries(data.attrs)) {
                parsedEl[key] = value
              }

              // ignore messages wich has isReply but there is no mainMessage field
              if (parsedEl.isReply === "true" && !parsedEl.mainMessage) {
                continue
              }

              if (parsedEl.mainMessage) {
                try {
                  parsedEl.mainMessage = JSON.parse(parsedEl.mainMessage)
                } catch (e) {
                  // ignore message if mainMessage is not parsable
                  continue;
                }
              }

              mainMessages.push(parsedEl)
            }
          }
          unsubscribe()
          resolve(mainMessages)
        }

        if (stanza.is("iq") && stanza.attrs.id === id && stanza.attrs.type === "error") {
          console.log(stanza.toString())
          unsubscribe()
          reject()
        }
      }

      this.client?.on("stanza", stanzaHdlrPointer);

      const message = xml(
        "iq",
        {
          type: "set",
          to: room,
          id: id,
        },
        xml(
          "query",
          { xmlns: "urn:xmpp:mam:2" },
          xml(
            "set",
            { xmlns: "http://jabber.org/protocol/rsm" },
            xml("max", {}, max.toString()),
            before ? xml("before", {}, before.toString()) : xml("before")
          )
        )
      )

      console.log(message.toString())
      this.client.send(message)
    })

    const timeoutPromise = createTimeoutPromise(10000, unsubscribe)

    try {
      const res = await Promise.race([responsePromise, timeoutPromise]);
      return res
    } catch (e) {
      console.log("=-> error ", e)
      return null
    }
  },

  async sendTextMessage(to: string, text: string) {
    const user = useChatStore.getState().user
    const message = xml(
      'message',
      {
        to: to,
        type: 'groupchat',
        id: 'sendMessage'
      },
      xml(
        'data',
        {
          xmlns: this.service,
          senderFirstName: user.firstName,
          senderLastName: user.lastName,
          photoURL: user.profileImage,
          senderWalletAddress: user.walletAddress,
          senderJID: this.client.jid.toString(),
          roomJid: to,
          isSystemMessage: false,
          tokenAmount: 0,
          quickReplies: '',
          notDisplayedValue: ''
        }
      ),
      xml(
        'body',
        {},
        text
      )
    )

    let stanzaHdlrPointer;

    const unsubscribe = () => {
      this.client.off('stanza', stanzaHdlrPointer)
    }

    const responsePromise = new Promise((resolve, reject) => {
      stanzaHdlrPointer = (stanza) => {
        if (stanza.is("message") && stanza.attrs["from"] === `${to}/${this.username}`) {
          const msg = stanza
          const text = msg.getChild('body')?.getText()

          if (text) {
            let parsedEl: Record<string, string> = {}

            parsedEl.text = text
            parsedEl.from = msg.attrs['from']
            parsedEl.id = msg.getChild('archived')?.attrs['id']
            const data = msg.getChild('data')

            for (const [key, value] of Object.entries(data.attrs)) {
              parsedEl[key] = value as string
            }

            console.log({ parsedEl })

            unsubscribe()
            resolve(parsedEl)
          }
        }
      }

      this.client.on("stanza", stanzaHdlrPointer)

      this.client.send(message)
    })

    const timeoutPromise = createTimeoutPromise(10000, unsubscribe)

    try {
      const res = await Promise.race([responsePromise, timeoutPromise]);
      return res
    } catch (e) {
      console.log("=-> error ", e)
      return null
    }
  },

  async sendTextMessageToThread(to: string, mainMessage: MessageType, text: string) {
    const user = useChatStore.getState().user
    const message = xml(
      'message',
      {
        to: to,
        type: 'groupchat',
        id: 'sendMessage'
      },
      xml(
        'data',
        {
          xmlns: this.service,
          senderFirstName: user.firstName,
          senderLastName: user.lastName,
          photoURL: user.profileImage,
          senderWalletAddress: user.walletAddress,
          senderJID: this.client.jid.toString(),
          roomJid: to,
          isSystemMessage: false,
          tokenAmount: 0,
          quickReplies: '',
          notDisplayedValue: '',
          showInChannel: "false",
          isReply: "true",
          mainMessage: JSON.stringify({
            attachmentId: "",
            contractAddress: "",
            createdAt: "",
            duration: "",
            id: Number(mainMessage.id),
            nftActionType: "",
            nftId: "",
            roomJid: "",
            size: "",
            text: mainMessage.text,
            userName: `${mainMessage.senderFirstName} ${mainMessage.senderLastName}`,
            waveForm: "",
            wrappable: ""
          })
        }
      ),
      xml(
        'body',
        {},
        text
      )
    )

    let stanzaHdlrPointer;

    const unsubscribe = () => {
      this.client.off('stanza', stanzaHdlrPointer)
    }

    const responsePromise = new Promise((resolve, reject) => {
      stanzaHdlrPointer = (stanza) => {
        if (stanza.is("message") && stanza.attrs["from"] === `${to}/${this.username}`) {
          const msg = stanza
          const text = msg.getChild('body')?.getText()

          if (text) {
            let parsedEl: Record<string, string> = {}

            parsedEl.text = text
            parsedEl.from = msg.attrs['from']
            parsedEl.id = msg.getChild('archived')?.attrs['id']
            const data = msg.getChild('data')

            for (const [key, value] of Object.entries(data.attrs)) {
              parsedEl[key] = value as string
            }

            console.log({ parsedEl })

            unsubscribe()
            resolve(parsedEl)
          }
        }
      }

      this.client.on("stanza", stanzaHdlrPointer)

      console.log("sending ", message.toString())
      this.client.send(message)
    })

    const timeoutPromise = createTimeoutPromise(10000, unsubscribe)

    try {
      const res = await Promise.race([responsePromise, timeoutPromise]);
      return res
    } catch (e) {
      console.log("=-> error ", e)
      return null
    }
  },

  async sendMediaMessage(to: string, data: Record<string, string>) {
    const user = useChatStore.getState().user
    const message = xml(
      'message',
      {
        to: to,
        type: 'groupchat',
        id: 'sendMessage'
      },
      xml(
        'data',
        {
          xmlns: this.service,
          senderFirstName: user.firstName,
          senderLastName: user.lastName,
          photoURL: user.profileImage,
          senderWalletAddress: user.walletAddress,
          senderJID: this.client.jid.toString(),
          roomJid: to,
          isSystemMessage: false,
          tokenAmount: 0,
          quickReplies: '',
          notDisplayedValue: '',
          isMediafile: true,
          location: data.location,
          locationPreview: data.locationPreview,
          mimetype: data.mimetype
        }
      ),
      xml(
        'body',
        {},
        'media'
      )
    )

    this.client.send(message)
  },

  deleteMessage(to: string, messageId: string) {
    // <message
    //   from="olek@localhost"
    //   id="1635229272917013"
    //   to="test_olek@conference.localhost"
    //   type="groupchat">
    //   <body>Wow</body>
    //   <delete id="1635229272917013" />
    // </message>;

    const stanza = xml(
      "message",
      {
        to: to,
        id: "deleteMessageStanza",
        type: "groupchat",
      },
      xml("body", "wow"),
      xml("delete", {
        id: messageId,
      })
    )

    this.client.send(stanza)
  }

}

function createTimeoutPromise(ms, unsubscribe) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      try {
        unsubscribe()
      } catch (e) { }
      reject()
    }, ms)
  })
}
