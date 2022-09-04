import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";

dotenv.config();

const app = express();
app.use(express.json());

const userSchema = joi.object({
  name: joi.string().required(),
  age: joi.number().required(),
});

const validation = userSchema.validate(user, { abortEarly: true });

if (validation.error) {
  console.log(validation.error.details);
}
// conectando ao banco
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("test");
});

// app.get("/usuarios", (req, res) => {
//   // buscando usuários
//   db.collection("users")
//     .find()
//     .toArray()
//     .then((users) => {
//       console.log(users); // array de usuários
//     });
// });

// app.post("/usuarios", (req, res) => {
//   // inserindo usuário
//   db.collection("users").insertOne({
//     email: "joao@email.com",
//     password: "minha_super_senha",
//   });
// });

app.listen(5000, () => {
  console.log("listening on port 5000");
});
