import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Update the MeterWithStatus type to match our implementation
export type MeterWithStatus =
  | { serial_number: string; type: string; status: "in_stock" }
  | {
      serial_number: string;
      type: string;
      status: "with_agent";
      agent_details: {
        agent_id: string;
        agent_name: string;
        agent_phone: string;
        assigned_at: string;
        agent_location: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "sold";
      sale_details: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "replaced";
      sale_details: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
      replacement_details: {
        replacement_serial: string;
        replacement_date: string;
        replacement_by: string;
      };
    }
  | {
      serial_number: string;
      type: string;
      status: "faulty";
      fault_details?: {
        reported_by: string;
        reported_at: string;
        fault_description: string;
        returned_at?: string;
        returner_name?: string;
        fault_status?: string;
      };
      sale_details?: {
        sold_at: string;
        sold_by: string;
        destination: string;
        recipient: string;
        customer_contact: string;
        unit_price: number;
        batch_id: string;
        status: string;
      };
    };

/**
 * Fetches all meters for CSV export without pagination
 */
export async function getAllMetersForExport(
  filterStatus?: string,
  filterType?: string | null,
  searchTerm?: string
): Promise<MeterWithStatus[]> {
  try {
    let allMeters: MeterWithStatus[] = [];

    // 1. STOCK METERS - Query from meters table
    if (!filterStatus || filterStatus === "in_stock") {
      try {
        let query = supabase.from("meters").select("id, serial_number, type");

      if (filterType && filterType !== "all") {
        query = query.eq("type", filterType);
      }

      if (searchTerm) {
        query = query.ilike("serial_number", `%${searchTerm}%`);
      }

        const { data: stockMeters, error } = await query;

        if (error) {
          console.error("Error fetching stock meters:", error);
        } else if (stockMeters && stockMeters.length > 0) {
          const processedStockMeters = stockMeters.map((meter) => ({
            serial_number: meter.serial_number,
            type: meter.type,
            status: "in_stock" as const,
          }));

          allMeters = [...allMeters, ...processedStockMeters];
        }
      } catch (error) {
        console.error("Error in stock meters query:", error);
      }
    }

    // 2. AGENT METERS - Query from agent_inventory joined with agents
    if (!filterStatus || filterStatus === "with_agent") {
      try {
        let query = supabase.from("agent_inventory").select(`
            id, 
          serial_number, 
            type, 
            assigned_at, 
            agent_id, 
            agents(id, name, phone_number, location)
          `);

      if (filterType && filterType !== "all") {
        query = query.eq("type", filterType);
      }

      if (searchTerm) {
        query = query.ilike("serial_number", `%${searchTerm}%`);
      }

        const { data: agentMeters, error } = await query;

        if (error) {
          console.error("Error fetching agent meters:", error);
        } else if (agentMeters && agentMeters.length > 0) {
          const processedAgentMeters = agentMeters.map((meter) => {
            // Type assertion for agents
            const agentData = meter.agents as any;

            return {
              serial_number: meter.serial_number,
              type: meter.type,
              status: "with_agent" as const,
              agent_details: {
                agent_id: meter.agent_id,
                agent_name: agentData ? agentData.name : "Unknown",
                agent_phone: agentData ? agentData.phone_number : "Unknown",
                assigned_at: meter.assigned_at,
                agent_location: agentData ? agentData.location : "Unknown",
              },
            };
          });

          allMeters = [...allMeters, ...processedAgentMeters];
        }
      } catch (error) {
        console.error("Error in agent meters query:", error);
      }
    }

    // 3. SOLD METERS - Query from sold_meters joined with sale_batches
    if (!filterStatus || filterStatus === "sold") {
      try {
      let query = supabase
        .from("sold_meters")
        .select(
          `
            id, 
          serial_number, 
          sold_by, 
          sold_at, 
          destination, 
          recipient, 
          customer_contact, 
          unit_price, 
          batch_id,
          status,
            sale_batches(meter_type)
        `
        )
          .eq("status", "active");

      if (filterType && filterType !== "all") {
        query = query.eq("sale_batches.meter_type", filterType);
      }

      if (searchTerm) {
        query = query.ilike("serial_number", `%${searchTerm}%`);
      }

        const { data: soldMeters, error } = await query;

        if (error) {
          console.error("Error fetching sold meters:", error);
        } else if (soldMeters && soldMeters.length > 0) {
        // Get user profiles for sold meters
          const userIds = [...new Set(soldMeters.map((m) => m.sold_by))];
        const { data: userProfiles, error: userError } = await supabase
          .from("user_profiles")
          .select("id, name")
          .in("id", userIds);

        if (userError) {
          console.error("Error fetching user profiles:", userError);
        }

        const userMap: Record<string, string> = {};
        if (userProfiles) {
            userProfiles.forEach((user) => {
            userMap[user.id] = user.name;
          });
        }

          const processedSoldMeters = soldMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

          return {
            serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
            status: "sold" as const,
            sale_details: {
              sold_at: meter.sold_at,
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination,
              recipient: meter.recipient,
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price,
              batch_id: meter.batch_id,
              status: meter.status,
            },
          };
        });

        allMeters = [...allMeters, ...processedSoldMeters];
        }
      } catch (error) {
        console.error("Error in sold meters query:", error);
      }
    }

    // 4. REPLACED METERS - Query from sold_meters with status=replaced
    if (!filterStatus || filterStatus === "replaced") {
      try {
        let query = supabase
          .from("sold_meters")
          .select(
            `
            id, 
            serial_number, 
            sold_by, 
            sold_at, 
            destination, 
            recipient, 
            customer_contact, 
            unit_price, 
            batch_id,
            status,
            replacement_serial,
            replacement_date,
            replacement_by,
            sale_batches(meter_type)
          `
          )
          .eq("status", "replaced");

        if (filterType && filterType !== "all") {
          query = query.eq("sale_batches.meter_type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: replacedMeters, error } = await query;

        if (error) {
          console.error("Error fetching replaced meters:", error);
        } else if (replacedMeters && replacedMeters.length > 0) {
        // Get user profiles for sold_by and replacement_by
        const userIds = [
          ...new Set([
              ...replacedMeters.map((m) => m.sold_by),
              ...replacedMeters.map((m) => m.replacement_by).filter(Boolean),
          ]),
        ];

        const { data: userProfiles, error: userError } = await supabase
          .from("user_profiles")
          .select("id, name")
          .in("id", userIds);

        if (userError) {
          console.error("Error fetching user profiles:", userError);
        }

        const userMap: Record<string, string> = {};
        if (userProfiles) {
            userProfiles.forEach((user) => {
            userMap[user.id] = user.name;
          });
        }

          const processedReplacedMeters = replacedMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

          return {
            serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
            status: "replaced" as const,
            sale_details: {
              sold_at: meter.sold_at,
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination,
              recipient: meter.recipient,
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price,
              batch_id: meter.batch_id,
              status: meter.status,
            },
            replacement_details: {
              replacement_serial: meter.replacement_serial || "Unknown",
              replacement_date: meter.replacement_date || "Unknown",
              replacement_by:
                userMap[meter.replacement_by] || meter.replacement_by,
            },
          };
        });

        allMeters = [...allMeters, ...processedReplacedMeters];
        }
      } catch (error) {
        console.error("Error in replaced meters query:", error);
      }
    }

    // 5. FAULTY METERS - Query from both faulty_returns and sold_meters with status=faulty
    if (!filterStatus || filterStatus === "faulty") {
      // 5.1 First query faulty_returns table
      try {
        let query = supabase.from("faulty_returns").select(`
            id, 
            serial_number, 
            type, 
            returned_by, 
            returned_at, 
            returner_name, 
            fault_description, 
            status
          `);

        if (filterType && filterType !== "all") {
          query = query.eq("type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: faultyMeters, error } = await query;

        if (error) {
          console.error(
            "Error fetching faulty meters from faulty_returns:",
            error
          );
        } else if (faultyMeters && faultyMeters.length > 0) {
          const processedFaultyMeters = faultyMeters.map((meter) => ({
          serial_number: meter.serial_number,
          type: meter.type,
          status: "faulty" as const,
          fault_details: {
              reported_by: meter.returned_by || "",
              reported_at: meter.returned_at || "",
              fault_description: meter.fault_description || "",
              returner_name: meter.returner_name || "",
              fault_status: meter.status || "pending",
          },
        }));

        allMeters = [...allMeters, ...processedFaultyMeters];
      }
      } catch (error) {
        console.error("Error in faulty_returns query:", error);
      }

      // 5.2 Then query sold_meters with status=faulty
      try {
        let query = supabase
          .from("sold_meters")
          .select(
            `
            id, 
            serial_number, 
            sold_by, 
            sold_at, 
            destination, 
            recipient, 
            customer_contact, 
            unit_price, 
            batch_id,
            status,
            sale_batches(meter_type)
          `
          )
          .eq("status", "faulty");

        if (filterType && filterType !== "all") {
          query = query.eq("sale_batches.meter_type", filterType);
        }

        if (searchTerm) {
          query = query.ilike("serial_number", `%${searchTerm}%`);
        }

        const { data: faultySoldMeters, error } = await query;

        if (error) {
          console.error(
            "Error fetching faulty meters from sold_meters:",
            error
          );
        } else if (faultySoldMeters && faultySoldMeters.length > 0) {
        // Get user profiles for sold_by
          const userIds = [...new Set(faultySoldMeters.map((m) => m.sold_by))];
        const { data: userProfiles, error: userError } = await supabase
          .from("user_profiles")
          .select("id, name")
          .in("id", userIds);

        if (userError) {
          console.error("Error fetching user profiles:", userError);
        }

        const userMap: Record<string, string> = {};
        if (userProfiles) {
            userProfiles.forEach((user) => {
            userMap[user.id] = user.name;
          });
        }

          const processedFaultySoldMeters = faultySoldMeters.map((meter) => {
            // Type assertion for sale_batches
            const batchData = meter.sale_batches as any;

          return {
            serial_number: meter.serial_number,
              type: batchData ? batchData.meter_type : "Unknown",
            status: "faulty" as const,
            sale_details: {
              sold_at: meter.sold_at,
              sold_by: userMap[meter.sold_by] || meter.sold_by,
              destination: meter.destination,
              recipient: meter.recipient,
              customer_contact: meter.customer_contact || "",
              unit_price: meter.unit_price,
              batch_id: meter.batch_id,
              status: meter.status,
            },
          };
        });

        allMeters = [...allMeters, ...processedFaultySoldMeters];
        }
      } catch (error) {
        console.error("Error in faulty sold_meters query:", error);
      }
    }

    return allMeters;
  } catch (error) {
    console.error("Error fetching all meters for export:", error);
    return [];
  }
}
