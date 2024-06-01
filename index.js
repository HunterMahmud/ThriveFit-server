const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

const app = express();

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      //   "https://nova-books.web.app",
      //   "https://nova-books.firebaseapp.com",
      //other links will be here
    ],
    credentials: true,
  })
);

app.use(express.json());
// app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USE}:${process.env.DB_PASS}@cluster0.9wkdqn0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const booksCollection = client.db("dbname").collection("collectionname");
   
    // verify functions
    // user defined middleware
    const verifyToken = async (req, res, next) => {
      const token = req.cookies?.token;
      //console.log(token);
      if (!token) {
        return res.status(401).send({ message: "not authorized" });
      }
      jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized" });
        }
        req.user = decoded;
        next();
      });
    };
    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req?.user?.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin) return res.status(403).send({message: 'unauthorize access'});
      next();
    };
    // books related api
    //load all books data
    app.get("/allBooks", verifyToken, async (req, res) => {
      // console.log(req.cookies?.token);
      let query = req.query;
      // console.log(query);
      if (query?.quantity == "0") {
        query = { quantity: { $ne: 0 } };
        // console.log(query);
      }
      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    //update book by id
    app.patch("/updatebook/:id", async (req, res) => {
      const info = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateInfo = {
        $set: {
          ...info,
        },
      };
      const result = await booksCollection.updateOne(query, updateInfo);
      res.send(result);
    });

    

    //jwt related api
    //jwt sign / token generate when login
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, {
        expiresIn: "1h",
      });
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      };

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // clearing Token
    app.get("/logout", async (req, res) => {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      };
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("gym server is running...");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
