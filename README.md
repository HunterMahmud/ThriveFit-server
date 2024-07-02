# Thrive Fit Server

**Visit the live site:** [ThriveFit](https://thrive-fit-f0d68.web.app/).

[Client Side Repository](https://github.com/HunterMahmud/ThriveFit-client)

## Description

This is the server-side code for the Thrive Fit application. It is built with Node.js, Express, and MongoDB, and uses JSON Web Tokens (JWT) for authentication.

## Prerequisites

- Node.js and npm installed on your machine.
- A MongoDB instance (local or remote).

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/HunterMahmud/ThriveFit-server.git
   cd thrive-fit-server
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root of the project and add the following environment variables:

   ```env
   DB_USE=your_mongodb_user
   DB_PASS=your_mongodb_password
   SECRET=your_jwt_secret
   ```

   Replace `your_mongodb_user`, `your_mongodb_password`, and `your_jwt_secret` with your actual values.

4. **Start the server**:

   ```sh
   npm start
   ```

   The server should now be running and accessible at `http://localhost:your_port_number`.

## Scripts

- `start`: Starts the server using `node index.js`.

## Author

- Hasan Al Mahmud
