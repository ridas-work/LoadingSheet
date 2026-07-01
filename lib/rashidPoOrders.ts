import { rashidActiveOrdersMongoFilter } from "@/lib/gateDelivery";
import { approvedOrdersMongoFilter } from "@/lib/orderApproval";

/** Factory orders not yet delivered (at gate or pending redelivery), approved for dispatch. */
export function rashidPendingPoOrdersMongoFilter() {
  return {
    $and: [rashidActiveOrdersMongoFilter(), approvedOrdersMongoFilter()],
  };
}
