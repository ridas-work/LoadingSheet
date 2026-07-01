import mongoose from "mongoose";

type FleetCache = {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __fleetMongooseCache: FleetCache | undefined;
}

const cache: FleetCache = global.__fleetMongooseCache ?? { conn: null, promise: null };
global.__fleetMongooseCache = cache;

/** Secondary connection to fleet.waleedtech.com.pk MongoDB (vehicles + drivers). */
export async function connectToFleetDatabase(): Promise<mongoose.Connection | null> {
  const uri = process.env.FLEET_MONGODB_URI?.trim();
  if (!uri) return null;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.createConnection(uri).asPromise();
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
