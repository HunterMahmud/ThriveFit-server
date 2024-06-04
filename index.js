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
    const forumCollection = client.db("gymDB").collection("forums");

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

    //jwt related api
    //jwt sign / token generate when login
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });
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
    app.post("/payment", async (req, res) => {
      const paymentInfo = req.body;
      // console.log(paymentInfo);
      const result = await paymentCollection.insertOne(paymentInfo);
      res.send(result);
    });

    //----------------------------------------------------
    //----------------------------------------------------
    //slot related api
    // get all slot of the specific user by user email
    app.get("/trainer-slots/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      try {
        const trainer = await trainerCollection.findOne({ email });
        if (!trainer) {
          return res.status(404).json({ error: "Trainer not found" });
        }

        const slots = trainer.availableTime;
        // console.log("slots: ",slots);
        // Get the payment info for the slots
        const payments = await paymentCollection
          .find({ trainerEmail: email })
          .toArray();
        // console.log("payments: ",payments);
        // Combine slots and payment info

        res.json({ payments, slots });
      } catch (err) {
        // console.error('Error getting trainer slots:', err);
        res.status(500).send("Internal server error");
      }
    });

    // add new slot to the 
    app.post('/trainer-add-slot/:email', async (req, res) => {
      const { email } = req.params;
      const { slotName, slotTime, availableDays, selectedClasses } = req.body;
  
      try {
        const result = await trainerCollection.updateOne(
          { email},
          { 
            $push: {
              slots: {
                slotName,
                slotTime,
                availableDays,
                selectedClasses
              }
            }
          }
        );
  
        if (result.modifiedCount > 0) {
          res.status(200).send({message: 'Slot added successfully'});
        } else {
          res.status(404).send('Trainer not found');
        }
      } catch (err) {
        console.error('Error adding slot:', err);
        res.status(500).send('Internal server error');
      }
    });
  

    //delete a slot by trainers email and slotValue  // need to update
    app.delete('/trainer-slots/:email/:slotValue', async (req, res) => {
      const { email, slotValue } = req.params;
    
      try {
        const trainer = await trainerCollection.findOne({ email });
    
        if (!trainer) {
          return res.status(404).json({ error: 'Trainer not found' });
        }
    
        // Filter out the slot to delete
        const updatedSlots = trainer.availableTime.filter(slot => slot.value !== slotValue);
    
        // Update the trainer document with the new availableTime array
        const result = await trainerCollection.updateOne(
          { email },
          { $set: { availableTime: updatedSlots } }
        );
    
        if (result.modifiedCount === 1) {
          res.json({ message: 'Slot deleted successfully' });
        } else {
          res.status(500).json({ error: 'Failed to delete slot' });
        }
      } catch (err) {
        console.error('Error deleting slot:', err);
        res.status(500).send('Internal server error');
      }
    });
    

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
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const { role } = req.body;
      // console.log(email);
      const updateDoc = {
        $set: {
          role: `${role}`,
        },
      };
      // console.log(role);
      const result = await userCollection.updateOne({ email }, updateDoc);
      res.send(result);
    });

    //----------------------------------------------------
    //----------------------------------------------------
    // trainer related api
    //apply for trainers from member
    app.post("/trainers", async (req, res) => {
      const trainerInfo = req.body;
      // console.log(trainerInfo);
      const isExists = await trainerCollection.findOne({
        email: trainerInfo.email,
      });
      if (isExists) {
        return res.send({ message: "pending" });
      }
      const result = await trainerCollection.insertOne(trainerInfo);
      res.send(result);
    });
    // load all trainers with status is success/pending depends on query
    app.get("/trainers", async (req, res) => {
      const { status } = req.query;
      // console.log(status);
      const query = { status };
      const result = await trainerCollection.find(query).toArray();
      res.send(result);
    });
    //load trainer by id
    app.get("/trainers/:data", async (req, res) => {
      const data = req.params.data;
      let query = {};
      if(data.includes('@')){
        query = {email:data};
      }
      else{
        query = { _id: new ObjectId(data) };
      }
      const result = await trainerCollection.findOne(query);
      res.send(result);
    });
    //delete specific trainers by id
    app.delete("/trainers/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await trainerCollection.deleteOne(query);
      res.send(result);
    });
    // find trainers by id and update the status by pending to success
    app.patch("/trainers/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "success",
        },
      };
      const result = await trainerCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //----------------------------------------------------
    //----------------------------------------------------

    // classes apis
    // get all the class with full details
    app.get("/classes", async (req, res) => {
      try {
        const classes = await classeCollection.find().toArray();

        const classesWithTrainers = await Promise.all(
          classes.map(async (classItem) => {
            const foundTrainers = await trainerCollection
              .find({
                skills: { $elemMatch: { value: classItem.name.toLowerCase() } },
              })
              .project({
                _id: 1,
                fullName: 1,
                profileImage: 1,
              })
              .toArray();

            return {
              ...classItem,
              foundTrainers,
            };
          })
        );

        res.send(classesWithTrainers);
      } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    });
    // get only class names
    app.get("/classnames", async (req, res) => {
      const options = {
        projection: { _id: 0, name: 1 },
      };
      const result = await classeCollection.find({}, options).toArray();
      res.send(result);
    });
    /// add new class
    app.post("/classes", async (req, res) => {
      const classInfo = req.body;
      // console.log(classInfo);
      const result = await classeCollection.insertOne(classInfo);
      res.send(result);
    });

    //----------------------------------------------------
    //----------------------------------------------------
    // total balance and get 6 leatest transactins details
    app.get("/balance-transactions", async (req, res) => {
      try {
        // Calculate total balance
        const balancePipeline = [
          {
            $addFields: {
              priceInt: { $toInt: "$price" },
            },
          },
          {
            $group: {
              _id: null,
              totalBalance: { $sum: "$priceInt" },
            },
          },
        ];
        const balanceResult = await paymentCollection
          .aggregate(balancePipeline)
          .toArray();
        const totalBalance = balanceResult[0]?.totalBalance || 0;

        // Fetch recent transactions
        const sort = { orderDate: -1 }; // Sort by orderDate descending
        const limit = 6; // Limit to 6 recent transactions
        const transactions = await paymentCollection
          .find()
          .sort(sort)
          .limit(limit)
          .toArray();
        const formattedTransactions = transactions.map((t) => ({
          username: t.userName,
          orderDate: t.orderDate,
          price: t.price,
        }));

        // Send combined result
        res.json({ totalBalance, transactions: formattedTransactions });
      } catch (err) {
        console.error("Error getting balance and transactions:", err);
        res.status(500).send("Internal server error");
      }
    });

    //get all the unique email occured in payments collection

    app.get("/unique-emails", async (req, res) => {
      try {
        const pipeline = [
          {
            $group: {
              _id: "$userEmail",
            },
          },
          {
            $count: "uniqueEmails",
          },
        ];

        const result = await paymentCollection.aggregate(pipeline).toArray();
        const totalPaidUser = result[0]?.uniqueEmails || 0;
        const totalNewsLetterSubscriber =
          await newsLetterCollection.estimatedDocumentCount();

        res.json({ totalPaidUser, totalNewsLetterSubscriber });
      } catch (err) {
        res.status(500).send("Internal server error");
      }
    });

    //----------------------------------------------------
    //----------------------------------------------------
    /// other api
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
    
    //forums related api
      // Add Forum Post API
  app.post('/forums', async (req, res) => {
    const { title, content, imageUrl, author, email, role } = req.body;

    const newPost = {
      title,
      content,
      imageUrl, // Add imageUrl to the newPost object
      author,
      email,
      role,
      createdAt: new Date()
    };

    try {
      const result = await forumCollection.insertOne(newPost);

     res.send(result);
    } catch (err) {
      console.error('Error adding forum post:', err);
      res.status(500).send('Internal server error');
    }
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
