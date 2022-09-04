import express from "express";
import { MongoClient } from "mongodb";
import mongodb from "mongodb";

import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());

const userSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

// conectando ao banco
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("test");
});

async function removeUser() {
  const participants = await db.collection("participants").find({}).toArray();
  console.log("Chamou a funcao de remover");
  await console.log(participants);

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];

    let timeSinceLastStatus = Date.now() - participant.lastStatus;
    console.log(participant.name + " - " + timeSinceLastStatus);

    if (timeSinceLastStatus > 10000) {
      await db
        .collection("participants")
        .deleteOne({ _id: new mongodb.ObjectId(participant._id) });

      const messageToBeSaved = {
        from: participant.name,
        time: dayjs(new Date()).format("HH-mm-ss"),
        text: "sai da sala ...",
        to: "Todos",
        type: "status",
      };

      await db.collection("messages").insertOne({ ...messageToBeSaved });
      console.log(`removeu ${participant.name}`);
    }
  }
}
app.post("/participants", async (req, res) => {
  // inserindo usuário

  const user = req.body;
  console.log(user);

  const validation = userSchema.validate(user, { abortEarly: true });

  if (validation.error) {
    console.log(validation.error.details.map((x) => x.message));
    res.status(422).send({});
  } else if (await db.collection("participants").findOne({ name: user.name })) {
    res.status(409).send("nome repetido");
  } else {
    db.collection("participants").insertOne({
      lastStatus: Date.now(),
      ...user,
    });
    res.status(201).send("OK");
  }
});

app.get("/participants", async (req, res) => {
  const participants = await db.collection("participants").find({}).toArray();
  res.status(200).send(participants);
});

app.post("/messages", async (req, res) => {
  // inserindo usuário

  const message = req.body;
  const from = req.headers.user;

  const validation = messageSchema.validate(message, { abortEarly: true });
  const hasName = await db.collection("participants").findOne({ name: from });
  console.log(hasName);

  const messageToBeSaved = {
    from: from,
    time: dayjs(new Date()).format("HH-mm-ss"),
    ...message,
  };
  console.log(messageToBeSaved);

  if (validation.error) {
    console.log(validation.error.details.map((x) => x.message));
    res.status(422).send({});
  } else if (!hasName) {
    res.status(422).send("nome não está presente na lista");
  } else {
    db.collection("messages").insertOne({ ...messageToBeSaved });
    res.status(201).send("OK");
  }
});

app.get("/messages", async (req, res) => {
  const messages = await db.collection("messages").find({}).toArray();
  const limit = parseInt(req.query.limit);
  const user = req.headers.user;

  const filteredMessages = messages.filter((x) => {
    return (
      x.from === user ||
      x.to === user ||
      x.type === "message" ||
      x.type === "status"
    );
  });

  if (filteredMessages.length <= limit) {
    res.status(200).send(filteredMessages);
  } else {
    const newMessage = [];
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      newMessage.unshift(filteredMessages[i]);
      if (newMessage.length === limit) break;
    }
    res.status(200).send(newMessage);
  }
});

app.post("/status", async (req, res) => {
  const user = req.headers.user;
  const hasUser = await db.collection("participants").findOne({ name: user });

  const updateDoc = {
    $set: {
      lastStatus: Date.now(),
    },
  };

  if (!hasUser) {
    res.status(404).send();
  } else {
    db.collection("participants").updateOne({ name: user }, updateDoc);
    res.status(200).send();
  }
});

setInterval(removeUser, 15000);

app.listen(5000, () => {
  console.log("listening on port 5000");
});
