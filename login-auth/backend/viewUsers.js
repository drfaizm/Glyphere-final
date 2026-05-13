const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const viewUsers = async () => {
  try {
    const db = process.env.MONGO_URI || 'mongodb://localhost:27017/login-auth';
    
    await mongoose.connect(db);
    console.log('Connected to MongoDB...\n');

    const users = await User.find({}, { password: 0 }); // Fetch all users, exclude passwords
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log('--- Registered Users ---');
      console.table(users.map(user => ({
        ID: user._id.toString(),
        Name: user.name,
        Email: user.email,
        Date: user.date.toLocaleString()
      })));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  } catch (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
};

viewUsers();
