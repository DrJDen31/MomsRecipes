export const TAG_CATEGORIES = {
  'Meal Type': ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink'],
  'Cuisine': ['Asian', 'Mexican', 'Italian', 'American', 'Mediterranean', 'Indian', 'French'],
  'Dietary': ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Low-Carb'],
  'Style': ['Spicy', 'Comfort', 'Quick', 'Healthy', 'Fancy']
};

export const ALL_TAGS = Object.values(TAG_CATEGORIES).flat();
