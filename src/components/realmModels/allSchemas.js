import * as schemaTypes from '../../constants/realmConstants';
const Realm = require('realm');

const MessageSchema = {
    name:schemaTypes.MESSAGE_SCHEMA,
    primaryKey:"message_id",
    properties:{
        message_id:'string',
        text:'string',
        createdAt:'date',
        user_id:'string?',
        name:'string?',
        avatar:'string?',
        room_name:'string',
        system:'bool',
        tokenAmount:'int?',
        realImageURL:'string?',
        localURL:'string?',
        image:'string?',
        isStoredFile:'bool?',
        mimetype:'string?',
        size:'string?'
    }
}

const ChatListSchema={
    name:schemaTypes.CHAT_LIST_SCHEMA,
    primaryKey:"jid",
    properties:{
        name:'string',
        participants:'int',
        avatar:'string',
        jid:'string',
        counter:'int',
        lastUserText:'string',
        lastUserName:'string',
        createdAt:'date?'
    }
}

const TransactionSchema={
    name: schemaTypes.TRANSACTION_SCHEMA,
    primaryKey:"transactionHash",
    properties:{
        blockNumber:'int',
        from:'string',
        fromFirstName:'string',
        fromLastName:'string',
        toFirstName:'string',
        toLastName:'string',
        timestamp:'date',
        to:'string',
        tokenId:'string',
        tokenName:'string',
        transactionHash:'string',
        type:'string',
        value:'int'
    }
}

export const databaseOptions = {
    path: 'ETHORA.realm',
    schema:[MessageSchema, ChatListSchema, TransactionSchema],
    schemaVersion: 0, //optional
}

export const realm = new Realm(databaseOptions);

export const deleteAllRealm =()=> {
    realm.write(()=>{
        realm.deleteAll()
    });
}