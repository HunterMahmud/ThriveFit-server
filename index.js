const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
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
    const newsLetterCollection = client.db("gymDB").collection("newsletter");
    const userCollection = client.db("gymDB").collection("users");
    const trainerCollection = client.db("gymDB").collection("trainers");
    const classeCollection = client.db("gymDB").collection("classes");
    const paymentCollection = client.db("gymDB").collection("payments");

    //----------------------------------------------------
    //----------------------------------------------------
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
      const isAdmin = user?.role === "admin";
      if (!isAdmin)
        return res.status(403).send({ message: "unauthorize access" });
      next();
    };

    //----------------------------------------------------
    //----------------------------------------------------
    //booking related api
    app.post('/payment', async(req,res)=>{
      const paymentInfo = req.body;
      // console.log(paymentInfo);
      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result);
    })
















    //----------------------------------------------------
    //----------------------------------------------------

    // user related api
    app.post("/user", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const isExists = await userCollection.findOne(query);
      if (isExists) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      // console.log(userInfo);
      userInfo.role = "member";
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // user role update method using patch by email
    app.patch('/user/:email', async(req,res)=>{
      const email = req.params.email;
      const {role} = req.body;
      // console.log(email);
      const updateDoc = {
        $set: {
          role: `${role}`
        },
      };
      // console.log(role);
      const result = await userCollection.updateOne({email},updateDoc);
      res.send(result);
    })

    //----------------------------------------------------
    //----------------------------------------------------
    // trainer related api
    //apply for trainers from member
    app.post("/trainers", async (req, res) => {
      const trainerInfo = req.body;
      // console.log(trainerInfo);
      const isExists = await trainerCollection.findOne({email:trainerInfo.email})
      if(isExists){
        return res.send({message:'pending'})
      }
      const result = await trainerCollection.insertOne(trainerInfo);
      res.send(result);
    });
    // load all trainers with status is success
    app.get('/trainers', async(req,res)=>{
      const query = {status:'success'}
      const result = await trainerCollection.find(query).toArray();
      res.send(result);
    })
    //load trainer by id
    app.get('/trainers/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await trainerCollection.findOne(query);
      res.send(result);
    })
    //delete specific trainers by id
    app.delete('/trainers/:id',async(req,res)=>{
      const id = req.params.id;
      console.log(id);
      const query = {_id:new ObjectId(id)};
      const result = await trainerCollection.deleteOne(query);
      res.send(result);

    })

    //----------------------------------------------------
    //----------------------------------------------------

    //jwt related api
    //jwt sign / token generate when login
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    //----------------------------------------------------
    //----------------------------------------------------

    /// other api

    // classes apis
   // get all the class with full details
    app.get('/classes', async (req, res) => {
      try {
        const classes = await classeCollection.find().toArray();
        
        const classesWithTrainers = await Promise.all(classes.map(async (classItem) => {
          const foundTrainers = await trainerCollection.find({
            skills: { $elemMatch: { value: classItem.name.toLowerCase() } }
          }).project({
            _id: 1,
            fullName: 1,
            profileImage: 1
          }).toArray();
  
          return {
            ...classItem,
            foundTrainers
          };
        }));
  
        res.send(classesWithTrainers);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    });
    // get only class names
    app.get('/classnames', async(req,res)=>{
      const options = {
        projection: { _id: 0, name: 1},
      };
      const result = await classeCollection.find({}, options).toArray();
      res.send(result)
    })


    //newsletter post
    app.post("/newsletter", async (req, res) => {
      const info = req.body;
      // console.log(info);
      const result = await newsLetterCollection.insertOne(info);
      res.send(result);
    });
    //newsletter get
    app.get("/newsletter", async (req, res) => {
      const result = await newsLetterCollection.find().toArray();
      res.send(result);
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
