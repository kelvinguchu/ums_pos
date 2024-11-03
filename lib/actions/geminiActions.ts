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
2. Include specific numbers and data when available, do not include any dates.
3. If you don't have access to certain data, say so clearly
4. For vague queries, first refer to the current context, if still unclear, ask for clarification
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
  sale_details?: {
    sold_at: string;
    sold_by: string;
    seller_name?: string;
    seller_role?: string;
    destination: string;
    recipient: string;
    unit_price: number;
    batch_id: string;
    meter_type: string;
    batch_amount: number;
    total_price: number;
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

// Update the calculateChange function to handle zero values better
const calculateChange = (current: number, previous: number) => {
  if (current === previous) return 0;
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
};

// Add helper function to format comparison text
const formatComparisonText = (currentValue: number, previousValue: number, metric: string) => {
  if (currentValue === previousValue) {
    return `Both days had ${currentValue} ${metric}`;
  }
  const change = calculateChange(currentValue, previousValue);
  if (change === 0 && currentValue === 0 && previousValue === 0) {
    return `No ${metric} recorded on either day`;
  }
  return `${change > 0 ? 'Up' : 'Down'} by ${Math.abs(change).toFixed(1)}%`;
};

// Add helper functions for trend analysis
const calculateTrend = (currentValue: number, previousValue: number) => {
  const change = calculateChange(currentValue, previousValue);
  if (change > 10) return "strongly increasing ↑↑";
  if (change > 0) return "slightly increasing ↗";
  if (change < -10) return "strongly decreasing ↓";
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

// Add helper function for date comparison
const getDateForComparison = (dateStr: string): Date | null => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  if (dateStr.toLowerCase() === 'today') {
    return now;
  }
  
  if (dateStr.toLowerCase() === 'yesterday') {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date;
  }
  
  // Handle day names (e.g., "monday", "tuesday")
  const dayIndex = daysOfWeek.indexOf(dateStr.toLowerCase());
  if (dayIndex !== -1) {
    const date = new Date(now);
    const currentDay = date.getDay();
    const daysToSubtract = (currentDay + 7 - dayIndex) % 7;
    date.setDate(date.getDate() - daysToSubtract);
    return date;
  }
  
  // Handle "last week", "previous week"
  if (dateStr.toLowerCase().includes('last week') || dateStr.toLowerCase().includes('previous week')) {
    const date = new Date(now);
    date.setDate(date.getDate() - 7);
    return date;
  }
  
  return null;
};

// Add function to get sales for a specific date
const getSalesForDate = (salesData: SaleBatch[], date: Date) => {
  // Start of the given date in local timezone
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End of the given date in local timezone
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return salesData.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= startOfDay && saleDate <= endOfDay;
  });
};

// Add to the existing interfaces
interface LastContext {
  meter?: MeterResult;
  topic: string;
  timestamp: number;
}

// Add at the top level with other constants
let lastContext: LastContext = {
  topic: "",
  timestamp: 0
};

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
    let lastTopic = lastContext.topic;

    // Check if asking about who sold something
    if (userMessage.toLowerCase().includes("who sold") || 
        userMessage.toLowerCase().includes("seller") || 
        userMessage.toLowerCase().includes("sold by")) {
      if (lastContext.meter?.status === "sold" && lastContext.meter.sale_details) {
        const saleDetails = lastContext.meter.sale_details;
        const sellerInfo = saleDetails.seller_name 
          ? `${saleDetails.seller_name} (${saleDetails.seller_role})`
          : saleDetails.sold_by;
        
        additionalContext = `
          Seller Information:
          The meter ${lastContext.meter.serial_number} was sold by ${sellerInfo}.
          Sale Details:
          • Date: ${new Date(saleDetails.sold_at).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            })}
          • Destination: ${saleDetails.destination}
          • Recipient: ${saleDetails.recipient}
          • Price: KES ${saleDetails.unit_price?.toLocaleString()}
        `;
        lastTopic = "seller";
      } else {
        additionalContext = "I don't have any recent sale information to reference.";
      }
    }

    // Update the meter search section
    const serialNumberMatch = userMessage.match(/\b[A-Z0-9]+\b/i);
    if (serialNumberMatch || userMessage.toLowerCase().includes("meter")) {
      const searchTerm = serialNumberMatch ? serialNumberMatch[0] : "";
      if (searchTerm) {
        const meterResults = (await superSearchMeter(searchTerm)) as MeterResult[];
        if (meterResults.length > 0) {
          // Store the first result in lastContext for future reference
          lastContext = {
            meter: meterResults[0],
            topic: "meter",
            timestamp: Date.now()
          };
          
          additionalContext = `
            Meter Information:
            ${meterResults
              .map((meter) => {
                if (meter.status === "in_stock" && meter.type) {
                  return `- Meter ${meter.serial_number} (${meter.type}) is currently in stock`;
                } else if (meter.status === "with_agent" && meter.type && meter.agent) {
                  return `- Meter ${meter.serial_number} (${meter.type}) is with agent ${meter.agent.name} in ${meter.agent.location}`;
                } else if (meter.status === "sold" && meter.sale_details) {
                  const saleDate = meter.sale_details.sold_at ? new Date(meter.sale_details.sold_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  }) : 'Unknown date';

                  const formatPrice = (price?: number) => {
                    return price ? `KES ${price.toLocaleString()}` : 'N/A';
                  };

                  const sellerInfo = meter.sale_details.seller_name 
                    ? `${meter.sale_details.seller_name} (${meter.sale_details.seller_role})`
                    : meter.sale_details.sold_by || 'Unknown';

                  return `- Meter ${meter.serial_number} was sold on ${saleDate} by ${sellerInfo}
                    • Batch ID: ${meter.sale_details.batch_id || 'N/A'}
                    • Destination: ${meter.sale_details.destination || 'N/A'}
                    • Recipient: ${meter.sale_details.recipient || 'N/A'}
                    • Unit Price: ${formatPrice(meter.sale_details.unit_price)}
                    • Meter Type: ${meter.sale_details.meter_type || 'N/A'}
                    • Batch Size: ${meter.sale_details.batch_amount || 'N/A'} meters
                    • Total Batch Value: ${formatPrice(meter.sale_details.total_price)}`;
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
      const salesData = await getSaleBatches() as SaleBatch[];
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      // Sort sales by date (most recent first)
      const sortedSales = [...salesData].sort(
        (a, b) =>
          new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      );

      // Get most recent sale
      const mostRecentSale = sortedSales[0];
      if (mostRecentSale) {
        lastContext = {
          meter: {
            serial_number: `Batch #${mostRecentSale.id}`,
            status: "sold",
            sale_details: {
              sold_at: mostRecentSale.sale_date,
              sold_by: mostRecentSale.user_name,
              destination: mostRecentSale.destination,
              recipient: mostRecentSale.recipient,
              unit_price: mostRecentSale.unit_price,
              batch_id: mostRecentSale.id.toString(),
              meter_type: mostRecentSale.meter_type,
              batch_amount: mostRecentSale.batch_amount,
              total_price: mostRecentSale.total_price
            }
          },
          topic: "sales",
          timestamp: Date.now()
        };
      }

      // Calculate yesterday's date
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get sales for different periods using the common function
      const currentDaySales = getSalesForDate(salesData, now);
      const yesterdaySales = getSalesForDate(salesData, yesterday);

      // Extract dates for comparison from the user message
      const dateWords = userMessage.toLowerCase().split(' ');
      let comparisonDate: Date | null = null;

      for (const word of dateWords) {
        comparisonDate = getDateForComparison(word);
        if (comparisonDate) break;
      }

      // Get comparison date sales if available
      let comparisonSales: SaleBatch[] = [];
      if (comparisonDate) {
        comparisonSales = getSalesForDate(salesData, comparisonDate);
      }

      // Group sales by meter type
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

      const todayByType = groupSalesByType(currentDaySales);
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

        Here is the breakdown of today's sales:
        - Total Transactions: ${currentDaySales.length}
        - Total Meters: ${currentDaySales.reduce(
          (acc, sale) => acc + sale.batch_amount,
          0
        )}
        - Total Revenue: KES ${currentDaySales
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

      // Add comparison context if a comparison date was found
      if (comparisonDate) {
        const formatDateStr = (date: Date) => 
          date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        const todayMeters = currentDaySales.reduce((acc, sale) => acc + sale.batch_amount, 0);
        const todayRevenue = currentDaySales.reduce((acc, sale) => acc + sale.total_price, 0);
        const comparisonMeters = comparisonSales.reduce((acc, sale) => acc + sale.batch_amount, 0);
        const comparisonRevenue = comparisonSales.reduce((acc, sale) => acc + sale.total_price, 0);

        additionalContext += `
          \nSales Comparison:
          
          Today (${formatDateStr(now)}):
          - Total Transactions: ${currentDaySales.length}
          - Total Meters: ${todayMeters}
          - Total Revenue: KES ${todayRevenue.toLocaleString()}

          ${formatDateStr(comparisonDate)}:
          - Total Transactions: ${comparisonSales.length}
          - Total Meters: ${comparisonMeters}
          - Total Revenue: KES ${comparisonRevenue.toLocaleString()}

          Comparison Analysis:
          - Transactions: ${formatComparisonText(currentDaySales.length, comparisonSales.length, 'transactions')}
          - Meters: ${formatComparisonText(todayMeters, comparisonMeters, 'meters')}
          - Revenue: ${formatComparisonText(todayRevenue, comparisonRevenue, 'revenue')}
          
          ${currentDaySales.length === 0 && comparisonSales.length === 0 
            ? '\nNote: No sales were recorded on either day.' 
            : ''}
        `;
      }
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
${lastContext.meter ? `- Last Meter Queried: ${lastContext.meter.serial_number}` : ""}

${additionalContext}

User Question: ${userMessage}

If the question asks about "who sold" or similar, refer to the last meter's sale details if available.
Provide a helpful, data-driven response using the specific information provided in the context:`;

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
