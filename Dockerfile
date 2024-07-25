# Use the official Node.js image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application code to the working directory
COPY . .

# Expose the port that your application will run on
EXPOSE 3000

# Define the command to run your application
CMD [ "node", "index.js" ]
