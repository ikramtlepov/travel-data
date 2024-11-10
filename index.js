const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Secret key for JWT
const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";

// Helper functions to handle user data
function getUsers() {
  const data = fs.readFileSync("./users.json");
  return JSON.parse(data).users;
}

function saveUsers(users) {
  fs.writeFileSync("./users.json", JSON.stringify({ users }, null, 2));
}

// Helper functions to handle destinations data
function getDestinations() {
  try {
    const data = fs.readFileSync("./destinations.json");
    return JSON.parse(data).destinations;
  } catch (error) {
    console.error("Error reading destinations.json", error);
    return [];
  }
}

function saveDestinations(destinations) {
  fs.writeFileSync("./destinations.json", JSON.stringify(destinations, null, 2));
}

// Helper functions to handle offers data
function getOffers() {
  try {
    const data = fs.readFileSync("./offers.json");
    return JSON.parse(data).offers;
  } catch (error) {
    console.error("Error reading offers.json", error);
    return [];
  }
}

function saveOffers(offers) {
  fs.writeFileSync("./offers.json", JSON.stringify({ offers }, null, 2));
}

// Helper function to create a slug from a title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

// Register endpoint
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  const users = getUsers();

  if (users.some((user) => user.email === email)) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
  };

  users.push(newUser);
  saveUsers(users);

  res.status(201).json({ message: "User registered successfully" });
});

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();

  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1h",
  });

  res.status(200).json({ message: "Login successful", token });
});

// Middleware for protected routes
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Public route: Get destinations
app.get("/destinations", (req, res) => {
  const destinations = getDestinations();
  res.json(destinations);
});

// Public route: Get offers
app.get("/offers", (req, res) => {
  const offers = getOffers();
  res.json(offers);
});

// Public route: Create destination
app.post("/destinations", (req, res) => {
  const { name, country, image, description } = req.body;
  const destinations = getDestinations();
  const slug = createSlug(name);
  const today = new Date().toISOString().split("T")[0];

  const newDestination = {
    id: destinations.length + 1,
    name,
    slug,
    country,
    image,
    description,
    createdAt: today,
  };

  destinations.push(newDestination);
  saveDestinations(destinations);

  res.status(201).json({
    message: "Destination created successfully",
    destination: newDestination,
  });
});

// Public route: Update destination
app.put("/destinations/:id", (req, res) => {
  let destinations = getDestinations();
  const destinationId = parseInt(req.params.id);
  const { name, country, image, description } = req.body;

  const destinationIndex = destinations.findIndex(d => d.id === destinationId);
  if (destinationIndex === -1) {
    return res.status(404).json({ message: "Destination not found" });
  }

  const slug = createSlug(name);
  destinations[destinationIndex] = {
    ...destinations[destinationIndex],
    name,
    slug,
    country,
    image,
    description,
  };

  saveDestinations(destinations);

  res.status(200).json({
    message: "Destination updated successfully",
    destination: destinations[destinationIndex],
  });
});

// Public route: Delete destination
app.delete("/destinations/:id", (req, res) => {
  let destinations = getDestinations();
  const destinationId = parseInt(req.params.id);

  const destinationIndex = destinations.findIndex(d => d.id === destinationId);
  if (destinationIndex === -1) {
    return res.status(404).json({ message: "Destination not found" });
  }

  destinations.splice(destinationIndex, 1);
  saveDestinations(destinations);

  res.status(200).json({ message: "Destination deleted successfully" });
});

// Public route: Create offer
app.post("/offers", (req, res) => {
  const { title, details, image, rating, price, destinationId } = req.body;
  const offers = getOffers();
  const slug = createSlug(title);
  const today = new Date().toISOString().split("T")[0];

  const newOffer = {
    id: offers.length + 1,
    title,
    slug,
    details,
    image,
    rating,
    price,
    destinationId,
    createdAt: today,
  };

  offers.push(newOffer);
  saveOffers(offers);

  res.status(201).json({ message: "Offer created successfully", offer: newOffer });
});

// Public route: Update offer
app.put("/offers/:id", (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);
  const { title, details, image, rating, price } = req.body;

  const offerIndex = offers.findIndex(o => o.id === offerId);
  if (offerIndex === -1) {
    return res.status(404).json({ message: "Offer not found" });
  }

  const slug = createSlug(title);
  offers[offerIndex] = {
    ...offers[offerIndex],
    title,
    slug,
    details,
    image,
    rating,
    price,
  };

  saveOffers(offers);

  res.status(200).json({ message: "Offer updated successfully", offer: offers[offerIndex] });
});

// Public route: Delete offer
app.delete("/offers/:id", (req, res) => {
  let offers = getOffers();
  const offerId = parseInt(req.params.id);

  const offerIndex = offers.findIndex(o => o.id === offerId);
  if (offerIndex === -1) {
    return res.status(404).json({ message: "Offer not found" });
  }

  offers.splice(offerIndex, 1);
  saveOffers(offers);

  res.status(200).json({ message: "Offer deleted successfully" });
});






// Protected route: Book an offer
app.post("/offers/:id/book", authenticateToken, (req, res) => {
  const offers = getOffers();
  const offerId = parseInt(req.params.id);

  const offer = offers.find(o => o.id === offerId);
  if (!offer) {
    return res.status(404).json({ message: "Offer not found" });
  }

  const booking = {
    offerId: offer.id,
    userId: req.user.id,
    bookedAt: new Date().toISOString(),
  };

  // Save booking to a separate file or database if needed
  // This example just returns the booking response

  res.status(200).json({ message: "Offer booked successfully", booking });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
