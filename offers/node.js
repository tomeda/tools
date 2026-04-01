const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

let offerNumber = 0;

// Load the offer number from the JSON file on server start
fs.readFile('offerNumber.json', (err, data) => {
  if (!err) {
    const jsonData = JSON.parse(data);
    offerNumber = jsonData.offerNumber;
    console.log(`Offer number loaded: ${offerNumber}`);
  } else {
    console.error('Error reading offer number from file:', err);
  }
});

app.get('/offerNumber', (req, res) => {
  res.json({ offerNumber });
});

app.post('/incrementOffer', (req, res) => {
  offerNumber++;
  fs.writeFile('offerNumber.json', JSON.stringify({ offerNumber }), (err) => {
    if (err) {
      console.error('Error writing offer number to file:', err);
    } else {
      console.log('Offer number incremented and saved to file');
    }
  });
  res.send('Offer number incremented successfully');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
