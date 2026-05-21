const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express()
const port = process.env.PORT;

app.use(cors());
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/api/auth/jwks')
)

const verifyToken = async (req, res, next) => {
  const authHearer = req?.headers.authorization;
  if (!authHearer) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  const token = authHearer.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    // console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" })
  }
}

async function run() {
  try {
    await client.connect();

    const db = client.db("mediqueue");
    const tutorsCollection = db.collection("tutors");
    const addTutorCollection = db.collection("addTutors");
    const bookingCollection = db.collection("bookings")

    app.get('/feature', async (req, res) => {
      const result = await tutorsCollection.find().limit(6).toArray();
      res.send(result);
    })

    app.get("/tutors", async (req, res) => {
      const { search = "", startDate, endDate } = req.query;

      let query = {};

      if (search) {
        query.tutorName = {
          $regex: search,
          $options: "i",
        };
      }

      if (startDate && endDate) {
        query.sessionDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      const result = await tutorsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/tutors/:tutorId', verifyToken, async (req, res) => {
      const { tutorId } = req.params;
      const result = await tutorsCollection.findOne({ _id: new ObjectId(tutorId) });
      res.send(result);
    })

    app.get('/addTutor', verifyToken, async (req, res) => {
      const result = await addTutorCollection.find().toArray();
      res.send(result);
    })

    app.post('/addTutor', verifyToken, async (req, res) => {
      const tutorData = req.body;
      // console.log(tutorData)
      const result = await addTutorCollection.insertOne(tutorData);
      res.send(result);
    })

    app.patch('/addTutor/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await addTutorCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      )
      res.send(result);
    })

    app.delete('/addTutor/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await addTutorCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    })

    app.get('/booking/:userId', verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ studentId: userId }).toArray();
      res.send(result)
    })

    app.patch('/booking/:id', verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { bookStatus: "cancelled" } }
      )
      res.send(result)
    })

    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body;
      const tutor = await tutorsCollection.findOne(
        { _id: new ObjectId(bookingData.tutorId) }
      )
      if (tutor.totalSlot <= 0) {
        return res.send({
          success: false,
          message: "No available slots left."
        })
      }

      const today = new Date();
      const sessionDate = new Date(tutor.sessionDate);
      if (today > sessionDate) {
        return res.send({
          success: false,
          message: "Booking time has expired."
        })
      }

      const result = await bookingCollection.insertOne(bookingData);

      await tutorsCollection.updateOne(
        { _id: new ObjectId(bookingData.tutorId) },
        { $inc: { totalSlot: -1 } }
      )

      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
