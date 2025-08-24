const Order = require("../models/Order");
const Menu = require("../models/Menu");

// Function to create sample data for testing
const createSampleData = async () => {
  try {
    // Check if we already have data
    const existingOrders = await Order.countDocuments();
    if (existingOrders > 0) {
      console.log("📊 Sample data already exists");
      return;
    }

    console.log("🌱 Creating sample data for analytics...");

    // Create sample menu items if they don't exist
    const existingMenuItems = await Menu.countDocuments();
    if (existingMenuItems === 0) {
      const sampleMenuItems = [
        { name: "Cherry Grill Special", price: 250, image: "", category: "Grill" },
        { name: "Myo Fried Rice", price: 180, image: "", category: "Lunch" },
        { name: "Thai Tea", price: 60, image: "", category: "Beverage" },
        { name: "Green Salad", price: 120, image: "", category: "Breakfast" },
        { name: "Tom Yum Soup", price: 140, image: "", category: "Dinner" },
        { name: "Grilled Chicken", price: 220, image: "", category: "Grill" },
        { name: "Pad Thai", price: 160, image: "", category: "Lunch" },
        { name: "Fresh Orange Juice", price: 80, image: "", category: "Beverage" },
      ];

      await Menu.insertMany(sampleMenuItems);
      console.log("✅ Sample menu items created");
    }

    // Create sample orders for the last 30 days
    const sampleOrders = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const orderDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const numOrders = Math.floor(Math.random() * 10) + 1; // 1-10 orders per day
      
      for (let j = 0; j < numOrders; j++) {
        const order = {
          tableNumber: `T${Math.floor(Math.random() * 20) + 1}`,
          items: [
            {
              name: ["Cherry Grill Special", "Myo Fried Rice", "Thai Tea", "Green Salad", "Tom Yum Soup", "Grilled Chicken", "Pad Thai", "Fresh Orange Juice"][Math.floor(Math.random() * 8)],
              price: [250, 180, 60, 120, 140, 220, 160, 80][Math.floor(Math.random() * 8)],
              quantity: Math.floor(Math.random() * 3) + 1
            },
            // Sometimes add a second item
            ...(Math.random() > 0.5 ? [{
              name: ["Cherry Grill Special", "Myo Fried Rice", "Thai Tea", "Green Salad", "Tom Yum Soup", "Grilled Chicken", "Pad Thai", "Fresh Orange Juice"][Math.floor(Math.random() * 8)],
              price: [250, 180, 60, 120, 140, 220, 160, 80][Math.floor(Math.random() * 8)],
              quantity: Math.floor(Math.random() * 2) + 1
            }] : [])
          ],
          status: "completed",
          createdAt: orderDate,
          paid: true,
          processedAt: new Date(orderDate.getTime() + Math.random() * 60 * 60 * 1000) // Processed within an hour
        };
        
        sampleOrders.push(order);
      }
    }

    await Order.insertMany(sampleOrders);
    console.log(`✅ Created ${sampleOrders.length} sample orders for analytics testing`);

  } catch (error) {
    console.error("❌ Error creating sample data:", error);
  }
};

module.exports = { createSampleData };
