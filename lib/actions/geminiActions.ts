import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getSaleBatches,
  getAgentsList,
  getRemainingMetersByType,
  getMeterCount,
  getAgentInventory,
  superSearchMeter,
  getUsersList,
  getMetersByBatchId,
} from "@/lib/actions/supabaseActions";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SYSTEM_PROMPT = `You are UMS Assistant, an AI helper for the UMS POS (Point of Sale) system for prepaid meters.
You have access to real-time data from the database and can provide specific insights.

Key system features you can help with:
- Viewing meter information and current status
- Checking agent inventory levels
- Monitoring sales performance
- Viewing inventory levels
- Checking user information

Important Notes:
1. Always check the provided context before responding
2. If someone asks about "them" or similar pronouns, refer to the most recently discussed topic
3. When asked about users/agents/meters, always check the data first
4. For action requests (add/create/assign), direct users to the UI buttons
5. If data is available, always include specific numbers and details

Response Guidelines:
1. Keep responses concise (1-3 sentences)
2. Include specific numbers and data when available
3. If you don't have access to certain data, say so clearly
4. For vague queries, ask for clarification
5. Focus on providing information, not taking actions`;

// Add type definitions for meter search results
interface MeterResult {
  serial_number: string;
  type?: string;
  status: "in_stock" | "with_agent" | "sold";
  agent?: {
    id: string;
    name: string;
    location: string;
  };
}

interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number;
}

interface SoldMeter {
  serial_number: string;
}

// Add formatDate function at the top level
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", " at");
};

// Add calculateChange function at the top level
const calculateChange = (current: number, previous: number) =>
  previous === 0 ? 100 : ((current - previous) / previous) * 100;

// Add helper functions for trend analysis
const calculateTrend = (currentValue: number, previousValue: number) => {
  const change = calculateChange(currentValue, previousValue);
  if (change > 10) return "strongly increasing ↑↑";
  if (change > 0) return "slightly increasing ↗";
  if (change < -10) return "strongly decreasing ↓↓";
  if (change < 0) return "slightly decreasing ↘";
  return "stable →";
};

const predictNextPeriod = (current: number, previous: number) => {
  const changeRate = calculateChange(current, previous) / 100;
  return current * (1 + changeRate);
};

// Add interfaces for sales analysis
interface SalesMetrics {
  totalMeters: number;
  totalRevenue: number;
  transactions: number;
}

interface TypePerformance {
  [key: string]: {
    totalMeters: number;
    totalRevenue: number;
    transactions: number;
  };
}

export async function getChatResponse(
  userMessage: string,
  context: {
    role?: string;
    currentPage?: string;
    recentActions?: string[];
  }
) {
  try {
    let additionalContext = "";
    let lastTopic = "";
    let lastSaleBatch: SaleBatch | null = null;

    // Enhanced sales analysis with better pattern matching
    if (
      userMessage.toLowerCase().includes("sales") ||
      userMessage.toLowerCase().includes("sold") ||
      userMessage.toLowerCase().includes("sell") ||
      userMessage.toLowerCase().includes("recent") ||
      userMessage.toLowerCase().includes("latest") ||
      userMessage.toLowerCase().includes("details") ||
      userMessage.toLowerCase().includes("batch") ||
      userMessage.toLowerCase().includes("earning") ||
      userMessage.toLowerCase().includes("revenue") ||
      userMessage.toLowerCase().includes("yesterday") ||
      userMessage.toLowerCase().includes("today") ||
      userMessage.toLowerCase().includes("transaction")
    ) {
      const salesData = (await getSaleBatches()) as SaleBatch[];
      const now = new Date();
      const today = new Date().toISOString().split("T")[0];

      // Sort sales by date (most recent first)
      const sortedSales = [...salesData].sort(
        (a, b) =>
          new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      );

      // Get most recent sale
      const mostRecentSale = sortedSales[0];
      lastSaleBatch = mostRecentSale;

      // Calculate yesterday's date
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Filter sales for today and yesterday
      const todaySales = sortedSales.filter(
        (sale) => new Date(sale.sale_date).toISOString().split("T")[0] === today
      );

      const yesterdaySales = sortedSales.filter(
        (sale) =>
          new Date(sale.sale_date).toISOString().split("T")[0] === yesterdayStr
      );

      // Group sales by meter type for today and yesterday
      const groupSalesByType = (sales: SaleBatch[]) => {
        return sales.reduce(
          (
            acc: { [key: string]: { count: number; revenue: number } },
            sale
          ) => {
            if (!acc[sale.meter_type]) {
              acc[sale.meter_type] = { count: 0, revenue: 0 };
            }
            acc[sale.meter_type].count += sale.batch_amount;
            acc[sale.meter_type].revenue += sale.total_price;
            return acc;
          },
          {}
        );
      };

      const todayByType = groupSalesByType(todaySales);
      const yesterdayByType = groupSalesByType(yesterdaySales);

      lastTopic = "sales";
      additionalContext = `
        Sales Analysis:

        Most Recent Transaction:
        ${
          mostRecentSale
            ? `${formatDate(mostRecentSale.sale_date)}: ${
                mostRecentSale.user_name
              } sold ${mostRecentSale.batch_amount} ${
                mostRecentSale.meter_type
              } meters to ${mostRecentSale.recipient} in ${
                mostRecentSale.destination
              } for KES ${mostRecentSale.total_price.toLocaleString()}`
            : "No sales recorded yet"
        }

        Today's Sales (${new Date().toLocaleDateString()}):
        - Total Transactions: ${todaySales.length}
        - Total Meters: ${todaySales.reduce(
          (acc, sale) => acc + sale.batch_amount,
          0
        )}
        - Total Revenue: KES ${todaySales
          .reduce((acc, sale) => acc + sale.total_price, 0)
          .toLocaleString()}
        Breakdown by Type:
        ${Object.entries(todayByType)
          .map(
            ([type, data]) =>
              `- ${type}: ${
                data.count
              } meters (KES ${data.revenue.toLocaleString()})`
          )
          .join("\n        ")}

        Yesterday's Sales (${yesterday.toLocaleDateString()}):
        - Total Transactions: ${yesterdaySales.length}
        - Total Meters: ${yesterdaySales.reduce(
          (acc, sale) => acc + sale.batch_amount,
          0
        )}
        - Total Revenue: KES ${yesterdaySales
          .reduce((acc, sale) => acc + sale.total_price, 0)
          .toLocaleString()}
        Breakdown by Type:
        ${Object.entries(yesterdayByType)
          .map(
            ([type, data]) =>
              `- ${type}: ${
                data.count
              } meters (KES ${data.revenue.toLocaleString()})`
          )
          .join("\n        ")}
      `;
    }

    // Add user query handling first since we're on users page
    if (
      userMessage.toLowerCase().includes("user") ||
      userMessage.toLowerCase().includes("users") ||
      context.currentPage === "/users" ||
      userMessage.toLowerCase().includes("them")
    ) {
      const users = await getUsersList();
      const activeUsers = users.filter((user) => user.isActive);
      const adminUsers = users.filter((user) => user.role === "admin");

      lastTopic = "users"; // Set the topic
      additionalContext = `
        User Information:
        - Total users: ${users.length}
        - Active users: ${activeUsers.length}
        - Admin users: ${adminUsers.length}
        - Regular users: ${users.length - adminUsers.length}
        
        User Details:
        ${users
          .map(
            (user) =>
              `- ${user.name || "Unnamed"}: ${user.role} (${
                user.isActive ? "Active" : "Inactive"
              })`
          )
          .join("\n        ")}
      `;
    }

    // Check for meter serial number queries
    const serialNumberMatch = userMessage.match(/\b[A-Z0-9]+\b/i);
    if (serialNumberMatch || userMessage.toLowerCase().includes("meter")) {
      const searchTerm = serialNumberMatch ? serialNumberMatch[0] : "";
      if (searchTerm) {
        const meterResults = (await superSearchMeter(
          searchTerm
        )) as MeterResult[];
        if (meterResults.length > 0) {
          additionalContext += `
            Meter Information:
            ${meterResults
              .map((meter) => {
                if (meter.status === "in_stock" && meter.type) {
                  return `- Meter ${meter.serial_number} (${meter.type}) is currently in stock`;
                } else if (
                  meter.status === "with_agent" &&
                  meter.type &&
                  meter.agent
                ) {
                  return `- Meter ${meter.serial_number} (${meter.type}) is with agent ${meter.agent.name} in ${meter.agent.location}`;
                } else if (meter.status === "sold") {
                  return `- Meter ${meter.serial_number} has been sold`;
                }
                return `- Meter ${meter.serial_number} status: ${meter.status}`;
              })
              .join("\n")}
          `;
        } else {
          additionalContext += `No meters found matching "${searchTerm}"`;
        }
      }
    }

    // Enhanced agent and inventory queries
    if (
      userMessage.toLowerCase().includes("agent") ||
      userMessage.toLowerCase().includes("agents") ||
      userMessage.toLowerCase().includes("name") ||
      userMessage.toLowerCase().includes("inventory") ||
      userMessage.toLowerCase().includes("serial")
    ) {
      // Check for specific agent name in query
      const agentNameMatch = userMessage.match(
        /(?:agent\s+)?([a-zA-Z\s]+(?:\s+Guchu|\s+Mumbi|\s+Kenyatta|\s+Laban))/i
      );
      const specificAgentName = agentNameMatch ? agentNameMatch[1].trim() : "";

      const agents = await getAgentsList();

      const agentInventories = await Promise.all(
        agents.map(async (agent) => {
          const inventory = await getAgentInventory(agent.id);
          return {
            ...agent,
            inventory: inventory || [],
            inventoryCount: inventory ? inventory.length : 0,
            inventoryByType: inventory
              ? inventory.reduce((acc: any, meter: any) => {
                  acc[meter.type] = (acc[meter.type] || 0) + 1;
                  return acc;
                }, {})
              : {},
          };
        })
      );

      // If asking about serial numbers or specific agent
      if (userMessage.toLowerCase().includes("serial") || specificAgentName) {
        const relevantAgents = specificAgentName
          ? agentInventories.filter((a) =>
              a.name.toLowerCase().includes(specificAgentName.toLowerCase())
            )
          : agentInventories.filter((a) => a.inventoryCount > 0);

        additionalContext = `
          Agent Inventory Details:
          ${relevantAgents
            .map(
              (agent) => `
            ${agent.name} (${agent.location}):
            ${
              agent.inventoryCount > 0
                ? `Has ${agent.inventoryCount} meters:
                ${agent.inventory
                  .map(
                    (meter: any) =>
                      `- Serial Number: ${meter.serial_number} (${meter.type})`
                  )
                  .join("\n            ")}`
                : "Has no meters in inventory"
            }`
            )
            .join("\n\n      ")}
        `;
      } else {
        // Original agent summary context
        const activeAgents = agentInventories.filter(
          (agent) => agent.is_active
        );
        const inactiveAgents = agentInventories.filter(
          (agent) => !agent.is_active
        );

        additionalContext = `
          Agent information:
          - Total agents: ${agents.length}
          - Active agents (${activeAgents.length}): ${activeAgents
          .map((a) => `${a.name} (${a.location})`)
          .join(", ")}
          ${
            inactiveAgents.length > 0
              ? `- Inactive agents (${inactiveAgents.length}): ${inactiveAgents
                  .map((a) => a.name)
                  .join(", ")}`
              : ""
          }
          
          Agent Inventory Summary:
          ${agentInventories
            .map((agent) => {
              const inventoryDetails = Object.entries(agent.inventoryByType)
                .map(([type, count]) => `${count} ${type}`)
                .join(", ");

              return `- ${agent.name}: ${
                agent.inventoryCount > 0
                  ? `Has ${agent.inventoryCount} meters (${inventoryDetails})`
                  : "Has no meters in inventory"
              }`;
            })
            .join("\n      ")}
        `;
      }
    }

    if (
      userMessage.toLowerCase().includes("stock") ||
      userMessage.toLowerCase().includes("meters")
    ) {
      const inventory = await getRemainingMetersByType();
      const totalMeters = await getMeterCount();

      additionalContext += `\n
        Main Stock Inventory:
        ${inventory
          .map((item) => `- ${item.type}: ${item.remaining_meters} meters`)
          .join("\n")}
        Total meters in main stock: ${totalMeters}
      `;
    }

    const prompt = `${SYSTEM_PROMPT}

Current Context:
- User Role: ${context.role || "user"}
- Current Page: ${context.currentPage || "dashboard"}
- Recent Actions: ${context.recentActions?.join(", ") || "None"}
- Last Topic Discussed: ${lastTopic}
- Last Sale Batch ID: ${lastSaleBatch?.id}

${additionalContext}

User Question: ${userMessage}

If the question uses pronouns like "them" or "they", assume it refers to ${lastTopic}.
If the question asks about "that sale" or "the sale", refer to the most recent sale discussed.
Provide a helpful, data-driven response using the specific information provided in the context. Include specific numbers and breakdowns when available:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response.text()) {
      throw new Error("No response received from the model");
    }

    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to get AI response. Please try again.");
  }
}
