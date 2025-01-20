import { createClient } from "@supabase/supabase-js";
import { CustomerType, KenyaCounty } from "@/lib/constants/locationData";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database Schema Definition
export const databaseSchema = {
  tables: {
    meters: {
      description: "Stores information about all meters in the system",
      fields: {
        id: "Primary key",
        serial_number: "Unique meter serial number",
        type: "Type/model of the meter",
        status: "Current status of the meter",
        batch_id: "Reference to purchase batch",
        added_by: "User ID who added the meter",
        added_at: "Timestamp when meter was added",
      },
      relationships: {
        agent_inventory: "One meter can be assigned to one agent",
        sold_meters: "One meter can be sold once",
        faulty_returns: "One meter can be marked as faulty",
      },
    },
    agents: {
      description: "Stores information about meter distribution agents",
      fields: {
        id: "Primary key",
        name: "Agent's full name",
        phone_number: "Agent's contact number",
        location: "Agent's primary location",
        county: "Agent's operating county",
        is_active: "Whether agent is currently active",
      },
      relationships: {
        agent_inventory: "One agent can have many meters",
        agent_transactions: "One agent can have many transactions",
      },
    },
    sale_batches: {
      description: "Records of meter sales transactions",
      fields: {
        id: "Primary key",
        user_id: "ID of user who made the sale",
        meter_type: "Type of meters sold",
        batch_amount: "Number of meters in batch",
        unit_price: "Price per meter",
        total_price: "Total sale amount",
        sale_date: "When the sale occurred",
        destination: "Where meters were delivered",
        recipient: "Who received the meters",
      },
    },
  },
};

// Tool Functions for Database Operations
export const databaseTools = {
  // Sales Analysis Tools
  async getSalesMetrics(
    timeframe: "today" | "week" | "month" | "custom",
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      let salesData;
      if (timeframe === "custom" && startDate && endDate) {
        salesData = await supabase
          .from("sale_batches")
          .select("*")
          .gte("sale_date", startDate.toISOString())
          .lte("sale_date", endDate.toISOString());
      } else {
        const now = new Date();
        const start = new Date();

        switch (timeframe) {
          case "today":
            start.setHours(0, 0, 0, 0);
            break;
          case "week":
            start.setDate(now.getDate() - 7);
            break;
          case "month":
            start.setMonth(now.getMonth() - 1);
            break;
        }

        salesData = await supabase
          .from("sale_batches")
          .select("*")
          .gte("sale_date", start.toISOString())
          .lte("sale_date", now.toISOString());
      }

      if (salesData.error) throw salesData.error;

      return {
        data: salesData.data,
        metrics: {
          totalSales: salesData.data.length,
          totalRevenue: salesData.data.reduce(
            (sum, sale) => sum + sale.total_price,
            0
          ),
          averagePrice:
            salesData.data.reduce((sum, sale) => sum + sale.unit_price, 0) /
            salesData.data.length,
          byMeterType: salesData.data.reduce((acc, sale) => {
            acc[sale.meter_type] =
              (acc[sale.meter_type] || 0) + sale.batch_amount;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      throw error;
    }
  },

  // Inventory Analysis Tools
  async getInventoryStatus() {
    try {
      const [metersData, agentInventoryData] = await Promise.all([
        supabase.from("meters").select("type, status"),
        supabase.from("agent_inventory").select("type, agent_id"),
      ]);

      if (metersData.error) throw metersData.error;
      if (agentInventoryData.error) throw agentInventoryData.error;

      const inStock = metersData.data.filter(
        (m) => !m.status || m.status === "in_stock"
      );
      const withAgents = agentInventoryData.data;

      return {
        totalMeters: metersData.data.length,
        inStock: {
          total: inStock.length,
          byType: inStock.reduce((acc, meter) => {
            acc[meter.type] = (acc[meter.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        withAgents: {
          total: withAgents.length,
          byAgent: withAgents.reduce((acc, meter) => {
            acc[meter.agent_id] = (acc[meter.agent_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      console.error("Error fetching inventory status:", error);
      throw error;
    }
  },

  // Agent Performance Tools
  async getAgentPerformance(timeframe: "week" | "month" | "year") {
    try {
      const now = new Date();
      const start = new Date();

      switch (timeframe) {
        case "week":
          start.setDate(now.getDate() - 7);
          break;
        case "month":
          start.setMonth(now.getMonth() - 1);
          break;
        case "year":
          start.setFullYear(now.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from("agent_transactions")
        .select(
          `
          *,
          agents (
            name,
            location
          )
        `
        )
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", now.toISOString());

      if (error) throw error;

      return data.reduce((acc, transaction) => {
        const agentId = transaction.agent_id;
        if (!acc[agentId]) {
          acc[agentId] = {
            name: transaction.agents.name,
            location: transaction.agents.location,
            totalTransactions: 0,
            totalValue: 0,
            metersSold: 0,
          };
        }

        acc[agentId].totalTransactions++;
        acc[agentId].totalValue += transaction.amount;
        acc[agentId].metersSold += transaction.quantity;

        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      console.error("Error fetching agent performance:", error);
      throw error;
    }
  },
};

// Response Formatters
export const formatters = {
  formatSalesResponse(data: any) {
    return {
      summary: `Total sales: ${
        data.metrics.totalSales
      }, Revenue: KES ${data.metrics.totalRevenue.toLocaleString()}, Average price: KES ${data.metrics.averagePrice.toLocaleString()}`,
      details: {
        byMeterType: Object.entries(data.metrics.byMeterType)
          .map(([type, count]) => `${type}: ${count} units`)
          .join(", "),
      },
    };
  },

  formatInventoryResponse(data: any) {
    return {
      summary: `Total meters: ${data.totalMeters}, In stock: ${data.inStock.total}, With agents: ${data.withAgents.total}`,
      details: {
        inStock: Object.entries(data.inStock.byType)
          .map(([type, count]) => `${type}: ${count}`)
          .join(", "),
        withAgents: Object.entries(data.withAgents.byAgent)
          .map(([agentId, count]) => `Agent ${agentId}: ${count} meters`)
          .join(", "),
      },
    };
  },
};

// Security Middleware
const securityMiddleware = {
  checkUserPermissions: async (userId: string, action: string) => {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userId)
      .single();

    if (!userProfile?.is_active) {
      throw new Error("User account is not active");
    }

    // Add role-based permission checks here
    return true;
  },
};

// Export the complete AI database tools system
export const aiDatabaseSystem = {
  schema: databaseSchema,
  tools: databaseTools,
  formatters,
  security: securityMiddleware,
};
