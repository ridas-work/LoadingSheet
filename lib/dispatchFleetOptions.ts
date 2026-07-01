import { connectToDatabase } from "@/lib/db";
import { connectToFleetDatabase } from "@/lib/fleetDb";
import { DispatchTrip } from "@/lib/models/DispatchTrip";

export type DispatchFleetOptions = {
  vehicles: string[];
  drivers: string[];
};

function sortNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function addTrimmed(set: Set<string>, value: unknown) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s) set.add(s);
}

/** Vehicle plates and driver names for Ali's dispatch trip form (fleet DB + trip history). */
export async function loadDispatchFleetOptions(): Promise<DispatchFleetOptions> {
  const vehicles = new Set<string>();
  const drivers = new Set<string>();

  try {
    const fleet = await connectToFleetDatabase();
    if (fleet?.db) {
      const [vehicleRows, driverRows] = await Promise.all([
        fleet.db.collection("vehicles").find({}, { projection: { plate: 1 } }).toArray(),
        fleet.db.collection("drivers").find({}, { projection: { name: 1 } }).toArray(),
      ]);
      for (const row of vehicleRows) addTrimmed(vehicles, row.plate);
      for (const row of driverRows) addTrimmed(drivers, row.name);
    }
  } catch (err) {
    console.error("[dispatchFleetOptions] fleet DB:", err);
  }

  try {
    await connectToDatabase();
    const [vehicleNos, driverNames] = await Promise.all([
      DispatchTrip.distinct("vehicleNo"),
      DispatchTrip.distinct("driverName"),
    ]);
    for (const v of vehicleNos) addTrimmed(vehicles, v);
    for (const d of driverNames) addTrimmed(drivers, d);
  } catch (err) {
    console.error("[dispatchFleetOptions] dispatch trips:", err);
  }

  return {
    vehicles: [...vehicles].sort(sortNames),
    drivers: [...drivers].sort(sortNames),
  };
}
