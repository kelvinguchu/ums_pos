import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getSaleBatches,
  getAgentsList,
  getRemainingMetersByType,
  getMeterCount,
  getAgentInventory,
  getAgentInventoryCount,
  superSearchMeter,
  getUsersList,
  getMetersByBatchId,
  getSalesThisWeek,
  getSalesThisMonth,
  getSalesLastXDays,
  aggregateSalesData,
  type AggregatedSales,
} from "@/lib/actions/supabaseActions";
import { createClient } from "@supabase/supabase-js";
import { aiDatabaseSystem } from "@/lib/actions/aiDatabaseTools";

// Enhanced context management interfaces
interface UserContext {
  id: string;
  role: "admin" | "accountant" | "user";
  name?: string;
  currentPage: string;
  lastActive: Date;
  recentActions: string[];
  preferences?: {
    notificationsEnabled: boolean;
    theme?: string;
    language?: string;
  };
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalMeters: number;
  lastUpdateTime: Date;
  dailyMetrics: {
    sales: {
      totalSales: number;
      totalRevenue: number;
      metersSold: number;
      topSellingType: string;
    };
    inventory: {
      totalStock: number;
      withAgents: number;
      recentAdditions: number;
    };
    agents: {
      activeCount: number;
      withInventory: number;
    };
  };
}

interface SystemContext {
  currentTime: Date;
  businessHours: {
    start: number;
    end: number;
    timezone: string;
  };
  systemMetrics: SystemMetrics;
  operationalStatus: {
    isBusinessHours: boolean;
    lastDatabaseSync: Date;
    activeOperations: string[];
    currentUser: any;
    userRole: string;
  };
}

interface ConversationContext {
  topic: string;
  timestamp: number;
  relevantMeters: string[];
  relevantAgents: string[];
  relevantSales: string[];
  intentClassification?: string;
  confidence: number;
  followUpQuestions?: string[];
  temporalContext?: {
    referenceDate: Date;
    dateRange?: {
      start: Date;
      end: Date;
    };
    comparisonPeriod?: string;
  };
  lastQueryContext?: {
    type: string;
    data: any;
    timestamp: number;
  };
}

interface EnhancedContext {
  user: UserContext;
  system: SystemContext;
  conversation: ConversationContext;
  previousContext?: EnhancedContext;
}

// Context management utilities
class ContextManager {
  private static instance: ContextManager;
  private currentContext: EnhancedContext | null = null;
  private contextHistory: EnhancedContext[] = [];
  private readonly MAX_HISTORY = 10;

  private constructor() {}

  static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  async initializeContext(
    userId: string,
    currentPage: string
  ): Promise<EnhancedContext> {
    const now = new Date();
    const isBusinessHours = this.checkBusinessHours(now);

    // Fetch all relevant data in parallel
    const [
      usersList,
      salesBatches,
      remainingMeters,
      agentsList,
      agentInventory,
    ] = await Promise.all([
      getUsersList(),
      getSaleBatches(),
      getRemainingMetersByType(),
      getAgentsList(),
      getAgentInventoryCount(),
    ]);

    // Calculate daily metrics
    const todaySales = salesBatches.filter(
      (sale) => new Date(sale.sale_date).toDateString() === now.toDateString()
    );

    const dailyMetrics = {
      sales: {
        totalSales: todaySales.length,
        totalRevenue: todaySales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        ),
        metersSold: todaySales.reduce(
          (sum, sale) => sum + sale.batch_amount,
          0
        ),
        topSellingType: this.calculateTopSellingType(todaySales),
      },
      inventory: {
        totalStock: remainingMeters.reduce(
          (sum, item) => sum + item.remaining_meters,
          0
        ),
        withAgents: agentInventory.reduce(
          (sum, item) => sum + item.with_agents,
          0
        ),
        recentAdditions: 0, // To be implemented with meter addition tracking
      },
      agents: {
        activeCount: agentsList.filter((agent) => agent.is_active).length,
        withInventory: agentsList.filter((agent) => agent.total_meters > 0)
          .length,
      },
    };

    const systemMetrics: SystemMetrics = {
      totalUsers: usersList.length,
      activeUsers: usersList.filter((u) => u.isActive).length,
      totalMeters: await getMeterCount(),
      lastUpdateTime: now,
      dailyMetrics,
    };

    const newContext: EnhancedContext = {
      user: {
        id: userId,
        role: "user",
        currentPage,
        lastActive: now,
        recentActions: [],
      },
      system: {
        currentTime: now,
        businessHours: {
          start: 8,
          end: 17,
          timezone: "Africa/Nairobi",
        },
        systemMetrics,
        operationalStatus: {
          isBusinessHours,
          lastDatabaseSync: now,
          activeOperations: [],
          currentUser: usersList.find((u) => u.id === userId),
          userRole: "user",
        },
      },
      conversation: {
        topic: "initial",
        timestamp: now.getTime(),
        relevantMeters: [],
        relevantAgents: [],
        relevantSales: [],
        confidence: 1.0,
        temporalContext: {
          referenceDate: now,
        },
      },
    };

    this.updateContext(newContext);
    return newContext;
  }

  private updateContext(newContext: EnhancedContext): void {
    if (this.currentContext) {
      this.contextHistory.push({ ...this.currentContext });
      if (this.contextHistory.length > this.MAX_HISTORY) {
        this.contextHistory.shift();
      }
    }
    this.currentContext = newContext;
  }

  getCurrentContext(): EnhancedContext | null {
    return this.currentContext;
  }

  getContextHistory(): EnhancedContext[] {
    return [...this.contextHistory];
  }

  updateUserAction(action: string): void {
    if (this.currentContext) {
      const updatedContext = {
        ...this.currentContext,
        user: {
          ...this.currentContext.user,
          lastActive: new Date(),
          recentActions: [
            action,
            ...this.currentContext.user.recentActions.slice(0, 4),
          ],
        },
      };
      this.updateContext(updatedContext);
    }
  }

  updateConversationContext(update: Partial<ConversationContext>): void {
    if (this.currentContext) {
      const updatedContext = {
        ...this.currentContext,
        conversation: {
          ...this.currentContext.conversation,
          ...update,
          timestamp: Date.now(),
        },
      };
      this.updateContext(updatedContext);
    }
  }

  private checkBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    return hour >= 8 && hour < 17; // 8 AM to 5 PM
  }

  private calculateTopSellingType(sales: SaleBatch[]): string {
    const typeCount = sales.reduce((acc, sale) => {
      acc[sale.meter_type] = (acc[sale.meter_type] || 0) + sale.batch_amount;
      return acc;
    }, {} as Record<string, number>);

    return (
      Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "No sales"
    );
  }
}

// Initialize context manager as a singleton
const contextManager = ContextManager.getInstance();

// Intent and entity recognition utilities
interface Intent {
  type: "query" | "action" | "comparison" | "analysis";
  subType: string;
  confidence: number;
  entities: Entity[];
  parameters: Record<string, unknown>;
}

interface Entity {
  type: "meter" | "agent" | "user" | "location" | "date" | "amount" | "price";
  value: string;
  position: [number, number];
  confidence: number;
}

class IntentClassifier {
  private static readonly INTENT_PATTERNS = {
    METER_QUERY: /\b(?:meter|serial|number)\b/i,
    SALES_QUERY: /\b(?:sales?|sold|revenue|earning|transaction)\b/i,
    INVENTORY_QUERY: /\b(?:inventory|stock|remaining|meters?)\b/i,
    AGENT_INVENTORY_QUERY:
      /\b(?:agent.*inventory|agent.*stock|agent.*meter)\b/i,
    USER_QUERY: /\b(?:user|admin|account)\b/i,
    COMPARISON: /\b(?:compare|difference|between|than|vs)\b/i,
    TEMPORAL: /\b(?:today|yesterday|last|previous|this|next)\b/i,
  };

  private static readonly ENTITY_PATTERNS = {
    METER: /\b[A-Z0-9]{6,}\b/i,
    AMOUNT: /\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:meters?|units?|pieces?)\b/i,
    PRICE: /\bKES\s*\d+(?:,\d{3})*(?:\.\d+)?\b/i,
    DATE: /\b(?:today|yesterday|last\s+(?:week|month)|[0-3]?[0-9]\/[0-1]?[0-9](?:\/\d{4})?)\b/i,
  };

  static classifyIntent(message: string): Intent {
    const patterns = IntentClassifier.INTENT_PATTERNS;
    const entities = this.extractEntities(message);

    let type: Intent["type"] = "query";
    let subType = "general";
    let confidence = 0.5;

    // Check inventory queries first
    if (patterns.AGENT_INVENTORY_QUERY.test(message)) {
      subType = "agent_inventory";
      confidence = 0.9;
    } else if (patterns.INVENTORY_QUERY.test(message)) {
      subType = "inventory";
      confidence = 0.85;
    } else if (patterns.COMPARISON.test(message)) {
      type = "comparison";
      confidence = 0.8;
      if (patterns.SALES_QUERY.test(message)) {
        subType = "sales_comparison";
        confidence = 0.9;
      }
    } else if (patterns.METER_QUERY.test(message)) {
      subType = "meter_info";
      confidence = entities.some((e) => e.type === "meter") ? 0.95 : 0.7;
    } else if (patterns.SALES_QUERY.test(message)) {
      subType = "sales_info";
      confidence = 0.85;
      if (patterns.TEMPORAL.test(message)) {
        subType = "sales_temporal";
        confidence = 0.9;
      }
    } else if (patterns.USER_QUERY.test(message)) {
      subType = "user_info";
      confidence = 0.8;
    }

    return {
      type,
      subType,
      confidence,
      entities,
      parameters: this.extractParameters(message, subType),
    };
  }

  private static extractEntities(message: string): Entity[] {
    const entities: Entity[] = [];
    const patterns = IntentClassifier.ENTITY_PATTERNS;

    // Extract meters
    const meterMatches = message.matchAll(new RegExp(patterns.METER, "gi"));
    for (const match of meterMatches) {
      if (match.index !== undefined) {
        entities.push({
          type: "meter",
          value: match[0],
          position: [match.index, match.index + match[0].length],
          confidence: 0.9,
        });
      }
    }

    // Extract amounts
    const amountMatches = message.matchAll(new RegExp(patterns.AMOUNT, "gi"));
    for (const match of amountMatches) {
      if (match.index !== undefined) {
        entities.push({
          type: "amount",
          value: match[0],
          position: [match.index, match.index + match[0].length],
          confidence: 0.85,
        });
      }
    }

    // Extract prices
    const priceMatches = message.matchAll(new RegExp(patterns.PRICE, "gi"));
    for (const match of priceMatches) {
      if (match.index !== undefined) {
        entities.push({
          type: "price",
          value: match[0],
          position: [match.index, match.index + match[0].length],
          confidence: 0.95,
        });
      }
    }

    // Extract dates
    const dateMatches = message.matchAll(new RegExp(patterns.DATE, "gi"));
    for (const match of dateMatches) {
      if (match.index !== undefined) {
        entities.push({
          type: "date",
          value: match[0],
          position: [match.index, match.index + match[0].length],
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  private static extractParameters(
    message: string,
    subType: string
  ): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};

    switch (subType) {
      case "sales_temporal":
      case "sales_comparison": {
        const dateEntities = this.extractEntities(message)
          .filter((e) => e.type === "date")
          .map((e) => e.value);
        if (dateEntities.length > 0) {
          parameters.dates = dateEntities;
        }
        break;
      }
      case "meter_info": {
        const meterEntities = this.extractEntities(message)
          .filter((e) => e.type === "meter")
          .map((e) => e.value);
        if (meterEntities.length > 0) {
          parameters.meters = meterEntities;
        }
        break;
      }
    }

    return parameters;
  }
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

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
3. When asked about users/agents/meters, always check the data first and provide EXACT counts
4. For action requests (add/create/assign), direct users to the UI buttons
5. If data is available, always include specific numbers and details
6. When reporting agent counts, use the EXACT number from the agents table
7. For agent inventory queries:
   - Always show the top 3 agents with their inventory details
   - For full breakdown, direct users to view the Agents page in the system
   - Never reference "provided above" or "context above" in responses

Response Guidelines:
1. Keep responses concise (1-3 sentences)
2. Include specific numbers and data when available, do not include any dates
3. If you don't have access to certain data, say so clearly
4. For vague queries, first refer to the current context, if still unclear, ask for clarification
5. Focus on providing information, not taking actions
6. For complete agent inventory details, suggest: "For a complete breakdown of all agents' inventory, please visit the Agents page in the system."`;

// Add type definitions for meter search results
interface MeterBase {
  serial_number: string;
  status: "in_stock" | "with_agent" | "sold" | "replaced" | "faulty";
}

interface InStockMeter extends MeterBase {
  status: "in_stock";
  type: string;
}

interface AgentMeter extends MeterBase {
  status: "with_agent";
  type: string;
  agent: {
    id: string;
    name: string;
    location: string;
  };
}

interface SaleDetails {
  sold_at: string;
  sold_by: string;
  seller_name?: string;
  seller_role?: string;
  destination: string;
  recipient: string;
  customer_contact: string;
  unit_price: number;
  batch_id: string;
  meter_type: string;
  batch_amount: number;
  total_price: number;
}

interface SoldMeter extends MeterBase {
  status: "sold";
  sale_details: SaleDetails;
  replacement_details: null;
}

interface ReplacedMeter extends Omit<MeterBase, "status"> {
  status: "replaced";
  sale_details: SaleDetails;
  replacement_details: {
    replacement_serial: string;
    replacement_date: string;
    replacement_by: string;
  };
}

interface FaultyMeter extends MeterBase {
  status: "faulty";
  type: string;
  fault_details: {
    returned_at: string;
    returner_name: string;
    fault_description: string;
    fault_status: string;
  };
}

type MeterResult =
  | InStockMeter
  | AgentMeter
  | SoldMeter
  | ReplacedMeter
  | FaultyMeter;

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

function isSoldMeter(meter: MeterResult): meter is SoldMeter | ReplacedMeter {
  return (
    (meter.status === "sold" || meter.status === "replaced") &&
    "sale_details" in meter
  );
}

function isAgentMeter(meter: MeterResult): meter is AgentMeter {
  return meter.status === "with_agent" && "agent" in meter;
}

function isInStockMeter(meter: MeterResult): meter is InStockMeter {
  return meter.status === "in_stock" && "type" in meter;
}

function isFaultyMeter(meter: MeterResult): meter is FaultyMeter {
  return meter.status === "faulty" && "fault_details" in meter;
}

// Type guard to ensure we have valid MeterResult objects
function isMeterResult(meter: any): meter is MeterResult {
  if (
    !meter ||
    typeof meter !== "object" ||
    !("serial_number" in meter) ||
    !("status" in meter)
  ) {
    return false;
  }

  switch (meter.status) {
    case "in_stock":
      return "type" in meter;
    case "with_agent":
      return "type" in meter && "agent" in meter;
    case "sold":
      return "sale_details" in meter && meter.replacement_details === null;
    case "replaced":
      return (
        "sale_details" in meter &&
        "replacement_details" in meter &&
        meter.replacement_details !== null
      );
    case "faulty":
      return "type" in meter && "fault_details" in meter;
    default:
      return false;
  }
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
const formatComparisonText = (
  currentValue: number,
  previousValue: number,
  metric: string
) => {
  if (currentValue === previousValue) {
    return `Both days had ${currentValue} ${metric}`;
  }
  const change = calculateChange(currentValue, previousValue);
  if (change === 0 && currentValue === 0 && previousValue === 0) {
    return `No ${metric} recorded on either day`;
  }
  return `${change > 0 ? "Up" : "Down"} by ${Math.abs(change).toFixed(1)}%`;
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
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  if (dateStr.toLowerCase() === "today") {
    return now;
  }

  if (dateStr.toLowerCase() === "yesterday") {
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
  if (
    dateStr.toLowerCase().includes("last week") ||
    dateStr.toLowerCase().includes("previous week")
  ) {
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

  return salesData.filter((sale) => {
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
  timestamp: 0,
};

// Add interfaces for inventory data
interface InventoryItem {
  type: string;
  remaining_meters: number;
}

interface AgentInventoryItem {
  type: string;
  with_agents: number;
}

interface MeterTypeInventory {
  type: string;
  inStock: number;
  withAgents: number;
  total: number;
}

function getBusinessHours() {
  return {
    start: 8, // 8 AM
    end: 17, // 5 PM
    timezone: "EAT",
  };
}

function checkBusinessHours(
  currentTime: Date,
  businessHours: ReturnType<typeof getBusinessHours>
): boolean {
  const hour = currentTime.getHours();
  return hour >= businessHours.start && hour < businessHours.end;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  is_active: boolean;
  created_at: string;
  county: string;
}

async function getSystemContext(): Promise<SystemContext> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized: No active session");
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!user) {
    throw new Error("User not found");
  }

  const currentTime = new Date();
  const businessHours = getBusinessHours();
  const isBusinessHours = checkBusinessHours(currentTime, businessHours);

  const dailyMetrics = await getDailyMetrics(supabase);
  const systemMetrics = await getSystemMetrics(supabase);

  return {
    currentTime,
    businessHours,
    operationalStatus: {
      isBusinessHours,
      currentUser: user,
      userRole: user.role,
      lastDatabaseSync: new Date(),
      activeOperations: [],
    },
    systemMetrics: {
      dailyMetrics,
      ...systemMetrics,
      lastUpdateTime: new Date(),
    },
  };
}

async function getDailyMetrics(supabase: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get sales from sale_batches table
  const { data: sales } = await supabase
    .from("sale_batches")
    .select("*")
    .gte("sale_date", today.toISOString());

  // Get inventory from meters table
  const { data: meters } = await supabase.from("meters").select("*");

  // Get agent inventory
  const { data: agentInventory } = await supabase
    .from("agent_inventory")
    .select("*");

  // Get accurate agent count directly from agents table
  const { data: agents, error: agentError } = await supabase
    .from("agents")
    .select("*");

  if (agentError) {
    console.error("Error fetching agents:", agentError);
    throw agentError;
  }

  const recentAdditions =
    meters?.filter((m: any) => new Date(m.added_at) >= yesterday)?.length || 0;

  return {
    sales: {
      totalSales: sales?.length || 0,
      totalRevenue:
        sales?.reduce((sum: number, sale: any) => sum + sale.total_price, 0) ||
        0,
      metersSold:
        sales?.reduce((sum: number, sale: any) => sum + sale.batch_amount, 0) ||
        0,
      topSellingType: getTopSellingType(sales || []),
    },
    inventory: {
      totalStock: meters?.filter((m: any) => !m.assigned_to)?.length || 0,
      withAgents: agentInventory?.length || 0,
      recentAdditions,
    },
    agents: {
      // Use the direct count from agents table
      activeCount: agents?.length || 0,
      withInventory:
        new Set(agentInventory?.map((m: any) => m.agent_id))?.size || 0,
    },
  };
}

async function getSystemMetrics(supabase: any) {
  // Get accurate agent count from agents table
  const { data: agents, error: agentError } = await supabase
    .from("agents")
    .select("*");

  if (agentError) {
    console.error("Error fetching agents:", agentError);
    throw agentError;
  }

  // Get user counts from user_profiles
  const { count: totalUsers } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact" });

  const { count: activeUsers } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  const { count: totalMeters } = await supabase
    .from("meters")
    .select("*", { count: "exact" });

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    totalMeters: totalMeters || 0,
    totalAgents: agents?.length || 0,
    activeAgents:
      agents?.filter((agent: Agent) => agent.is_active)?.length || 0,
  };
}

function getTopSellingType(sales: any[]): string {
  if (!sales.length) return "None";

  const typeCounts = sales.reduce((acc: any, sale: any) => {
    acc[sale.meter_type] = (acc[sale.meter_type] || 0) + sale.batch_amount;
    return acc;
  }, {});

  return Object.entries(typeCounts).sort(
    ([, a]: any, [, b]: any) => b - a
  )[0][0];
}

interface CustomRangeMetrics {
  label: string;
  metrics: AggregatedSales;
}

interface SalesAnalysis {
  today: AggregatedSales;
  yesterday: AggregatedSales;
  customRange: CustomRangeMetrics | null;
}

// Update extractDateRange to only allow specific time periods
function extractDateRange(message: string): string[] {
  const dates: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Only allow specific time periods
  if (lowerMessage.includes("today")) {
    dates.push("today");
  } else if (lowerMessage.includes("yesterday")) {
    dates.push("yesterday");
  } else if (lowerMessage.match(/this week/)) {
    dates.push("this_week");
  } else if (lowerMessage.match(/last week/)) {
    dates.push("last_week");
  } else if (
    lowerMessage.includes("30 days") ||
    lowerMessage.includes("this month")
  ) {
    dates.push("last_30_days");
  }

  return dates;
}

async function analyzeSalesData(
  salesData: SaleBatch[],
  dates: string[]
): Promise<SalesAnalysis> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get sales for different time periods
  const todaySales = getSalesForDate(salesData, now);
  const yesterdaySales = getSalesForDate(salesData, yesterday);

  // Handle custom date ranges
  let customRangeSales: SaleBatch[] = [];
  let customRangeLabel = "";

  for (const dateStr of dates) {
    if (dateStr === "all_time") {
      customRangeSales = salesData;
      customRangeLabel = "All Time";
    } else if (dateStr === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= startOfMonth && saleDate <= now;
      });
      customRangeLabel = `This Month (${startOfMonth.toLocaleString("default", {
        month: "long",
      })})`;
    } else if (dateStr === "previous_month") {
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= startOfLastMonth && saleDate <= endOfLastMonth;
      });
      customRangeLabel = `Last Month (${startOfLastMonth.toLocaleString(
        "default",
        { month: "long" }
      )})`;
    } else if (dateStr === "last_30_days") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= thirtyDaysAgo && saleDate <= now;
      });
      customRangeLabel = "Last 30 Days";
    } else if (dateStr === "this_week") {
      // Get Monday of current week
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= monday && saleDate <= now;
      });
      customRangeLabel = "This Week";
    } else if (dateStr === "last_week") {
      // Get Monday and Sunday of last week
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - now.getDay());
      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() - 6);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= lastMonday && saleDate <= lastSunday;
      });
      customRangeLabel = "Last Week";
    } else if (dateStr.startsWith("last_week_")) {
      const weeksAgo = parseInt(dateStr.split("_")[2]);
      const endDate = new Date(now);
      endDate.setDate(
        endDate.getDate() - (endDate.getDay() + 1) - 7 * (weeksAgo - 1)
      );
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= startDate && saleDate <= endDate;
      });
      customRangeLabel = weeksAgo === 1 ? "Last Week" : `${weeksAgo} Weeks Ago`;
    } else if (dateStr.startsWith("last_")) {
      const days = parseInt(dateStr.split("_")[1]);
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - days);
      customRangeSales = salesData.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= startDate && saleDate <= now;
      });
      customRangeLabel = `Last ${days} Days`;
    }
  }

  return {
    today: aggregateSalesData(todaySales),
    yesterday: aggregateSalesData(yesterdaySales),
    customRange: customRangeSales.length
      ? {
          label: customRangeLabel,
          metrics: aggregateSalesData(customRangeSales),
        }
      : null,
  };
}

function formatSalesAnalysis(analysis: SalesAnalysis): string {
  const { today, yesterday, customRange } = analysis;

  // Helper function to format meter type breakdown
  const formatTypeBreakdown = (metrics: AggregatedSales) => {
    return Object.entries(metrics.byType)
      .map(
        ([type, data]) =>
          `${type}: ${data.count} meters (KES ${data.revenue.toLocaleString()})`
      )
      .join(", ");
  };

  let response = `Today's sales show ${today.totalTransactions} transactions, ${
    today.totalMeters
  } meters sold, and KES ${today.totalRevenue.toLocaleString()} in revenue. `;

  // Add today's breakdown
  if (Object.keys(today.byType).length > 0) {
    response += `Breakdown by type: ${formatTypeBreakdown(today)}. `;
  }

  response += `Yesterday's sales were ${
    today.totalTransactions === yesterday.totalTransactions
      ? "the same"
      : today.totalTransactions > yesterday.totalTransactions
      ? "lower"
      : "higher"
  }, with ${yesterday.totalTransactions} transactions totaling ${
    yesterday.totalMeters
  } meters and KES ${yesterday.totalRevenue.toLocaleString()} in revenue. `;

  // Add yesterday's breakdown
  if (Object.keys(yesterday.byType).length > 0) {
    response += `Breakdown by type: ${formatTypeBreakdown(yesterday)}`;
  }

  if (customRange) {
    response += `\n\n${customRange.label} Summary:
• Total Transactions: ${customRange.metrics.totalTransactions}
• Total Meters Sold: ${customRange.metrics.totalMeters}
• Total Revenue: KES ${customRange.metrics.totalRevenue.toLocaleString()}
• Average Price per Meter: KES ${Math.round(
      customRange.metrics.averagePrice
    ).toLocaleString()}

        Breakdown by Type:
${Object.entries(customRange.metrics.byType)
  .map(
    ([type, data]) =>
      `• ${type}: ${data.count} meters (KES ${data.revenue.toLocaleString()})`
  )
  .join("\n")}`;
  }

  return response;
}

function formatSystemContext(system?: SystemContext): string {
  if (!system) return "";

  const { dailyMetrics } = system.systemMetrics;
  const operationalStatus = system.operationalStatus.isBusinessHours
    ? "Open"
    : "Closed";

  return `System State:
- Current Time: ${formatDate(
    system.currentTime.toISOString()
  )} (${operationalStatus})
- Business Hours: ${system.businessHours.start}:00 to ${
    system.businessHours.end
  }:00 ${system.businessHours.timezone}

Today's Metrics:
Sales:
• Total Sales: ${dailyMetrics.sales.totalSales}
• Revenue: KES ${dailyMetrics.sales.totalRevenue.toLocaleString()}
• Meters Sold: ${dailyMetrics.sales.metersSold}
• Top Selling Type: ${dailyMetrics.sales.topSellingType}

Inventory:
• Total Stock: ${dailyMetrics.inventory.totalStock}
• With Agents: ${dailyMetrics.inventory.withAgents}
• Total Available: ${
    dailyMetrics.inventory.totalStock + dailyMetrics.inventory.withAgents
  }

Agents:
• Active Agents: ${dailyMetrics.agents.activeCount}
• With Inventory: ${dailyMetrics.agents.withInventory}

System Overview:
• Total Users: ${system.systemMetrics.totalUsers}
• Active Users: ${system.systemMetrics.activeUsers}
• Last Updated: ${formatDate(
    system.systemMetrics.lastUpdateTime.toISOString()
  )}`;
}

function formatUserContext(user?: UserContext): string {
  if (!user) return "";

  return `User Context:
- Role: ${user.role}
- Current Page: ${user.currentPage}
- Last Active: ${formatDate(user.lastActive.toISOString())}
- Recent Actions: ${user.recentActions.join(", ")}`;
}

function formatConversationContext(conversation?: ConversationContext): string {
  if (!conversation) return "";

  let context = `Conversation Context:
- Current Topic: ${conversation.topic}
- Confidence: ${conversation.confidence}`;

  if (conversation.temporalContext) {
    const { temporalContext } = conversation;
    context += `\nTemporal Context:
- Reference Date: ${formatDate(temporalContext.referenceDate.toISOString())}`;

    if (temporalContext.dateRange) {
      context += `
- Date Range: ${formatDate(
        temporalContext.dateRange.start.toISOString()
      )} to ${formatDate(temporalContext.dateRange.end.toISOString())}`;
    }

    if (temporalContext.comparisonPeriod) {
      context += `
- Comparison Period: ${temporalContext.comparisonPeriod}`;
    }
  }

  if (conversation.relevantMeters.length > 0) {
    context += `\nRelevant Meters: ${conversation.relevantMeters.join(", ")}`;
  }
  if (conversation.relevantAgents.length > 0) {
    context += `\nRelevant Agents: ${conversation.relevantAgents.join(", ")}`;
  }
  if (conversation.relevantSales.length > 0) {
    context += `\nRelevant Sales: ${conversation.relevantSales.join(", ")}`;
  }

  return context;
}

function formatEntities(entities: Entity[]): string {
  return entities
    .map(
      (e) => `${e.type.toUpperCase()}: ${e.value} (confidence: ${e.confidence})`
    )
    .join(", ");
}

function formatMeterResults(meters: MeterResult[]): string {
  function formatMeter(meter: MeterResult): string {
    // Type narrowing with exhaustive checks
    if (isInStockMeter(meter)) {
      return `- Meter ${meter.serial_number} (${meter.type}) is currently in stock`;
    }
    if (isAgentMeter(meter)) {
      return `- Meter ${meter.serial_number} (${meter.type}) is with agent ${meter.agent.name} in ${meter.agent.location}`;
    }
    if (isSoldMeter(meter)) {
      return formatSoldMeterInfo(meter);
    }
    if (isFaultyMeter(meter)) {
      return `- Meter ${meter.serial_number} (${meter.type}) is marked as faulty: ${meter.fault_details.fault_description}`;
    }

    // Explicitly handle the base case with type assertion
    const baseMeter = meter as MeterBase;
    return `- Meter ${baseMeter.serial_number} status: ${baseMeter.status}`;
  }

  return `Meter Information:
${meters.map(formatMeter).join("\n")}`;
}

function formatSoldMeterInfo(meter: SoldMeter | ReplacedMeter): string {
  return `- Meter ${meter.serial_number} was sold on ${formatDate(
    meter.sale_details.sold_at
  )}
  • Sold by: ${meter.sale_details.seller_name || meter.sale_details.sold_by}
  • Destination: ${meter.sale_details.destination}
  • Recipient: ${meter.sale_details.recipient}
  • Price: KES ${meter.sale_details.unit_price?.toLocaleString()}
  • Batch: #${meter.sale_details.batch_id}`;
}

function formatUserInfo(users: any[]): string {
  const activeUsers = users.filter((user) => user.isActive);
  const adminUsers = users.filter((user) => user.role === "admin");

  return `User Information:
- Total Users: ${users.length}
- Active Users: ${activeUsers.length}
- Admin Users: ${adminUsers.length}
- Regular Users: ${users.length - adminUsers.length}
        
        User Details:
        ${users
          .map(
            (user) =>
              `- ${user.name || "Unnamed"}: ${user.role} (${
                user.isActive ? "Active" : "Inactive"
              })`
          )
          .join("\n")}`;
}

function formatAgentInfo(agents: any[]): string {
  return `Agent Information:
- Total Agents: ${agents.length}
- Active Agents: ${agents.filter((a) => a.is_active).length}

Agent Details:
${agents
  .map((agent) => {
    const inventoryCount = agent.inventory?.length || 0;
    return `- ${agent.name} (${agent.location}): ${
      inventoryCount > 0
        ? `Has ${inventoryCount} meters`
        : "No meters in inventory"
    }`;
  })
  .join("\n")}`;
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
    const lowerMessage = userMessage.toLowerCase();

    // If asking about inventory or agents
    if (
      lowerMessage.includes("inventory") ||
      lowerMessage.includes("stock") ||
      lowerMessage.includes("meters") ||
      lowerMessage.includes("available") ||
      lowerMessage.includes("agent")
    ) {
      // Get all required data in parallel with proper joins
      const [metersResult, agentInventoryResult, agentsResult] =
        await Promise.all([
          supabase.from("meters").select("*"),
          supabase.from("agent_inventory").select(`
          id,
          agent_id,
          meter_id,
          serial_number,
          type,
          assigned_at,
          agents:agent_id (
            id,
            name,
            location,
            county,
            is_active
          )
        `),
          supabase.from("agents").select("*").eq("is_active", true),
        ]);

      const meters = metersResult.data || [];
      const agentInventory = agentInventoryResult.data || [];
      const activeAgents = agentsResult.data || [];

      // Calculate inventory metrics
      const totalMeters = meters.length;
      const withAgents = agentInventory.length;
      const inStock = totalMeters - withAgents;

      // Get unique meter types
      const meterTypes = [...new Set(meters.map((m) => m.type))];

      // Calculate agent inventory breakdown with accurate counts
      const agentBreakdown = activeAgents
        .map((agent) => {
          const agentMeters = agentInventory.filter(
            (ai) => ai.agent_id === agent.id
          );

          return {
            name: agent.name,
            location: agent.location,
            county: agent.county,
            totalMeters: agentMeters.length,
            metersByType: meterTypes.reduce((acc, type) => {
              acc[type] = agentMeters.filter((am) => am.type === type).length;
              return acc;
            }, {} as Record<string, number>),
          };
        })
        .sort((a, b) => b.totalMeters - a.totalMeters); // Sort by most meters first

      // Update the agent inventory breakdown formatting
      additionalContext = `Current Inventory Status:
• Total Meters: ${totalMeters}
• In Stock: ${inStock}
• With Agents: ${withAgents}

Active Agents: ${activeAgents.length}

Breakdown by Type:
${meterTypes
  .map((type) => {
    const typeTotal = meters.filter((m) => m.type === type).length;
    const typeWithAgents = agentInventory.filter(
      (ai) => ai.type === type
    ).length;
    const typeInStock = typeTotal - typeWithAgents;
    return `• ${type}: ${typeTotal} total (${typeInStock} in stock, ${typeWithAgents} with agents)`;
  })
  .join("\n")}

Agent Inventory Breakdown (${withAgents} meters with ${
        activeAgents.length
      } agents):
${agentBreakdown
  .map((agent) => {
    if (agent.totalMeters === 0) {
      return `• ${agent.name} (${agent.location}): No meters in inventory`;
    }

    const typeBreakdown = Object.entries<number>(agent.metersByType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");

    return `• ${agent.name} (${agent.location}): ${agent.totalMeters} meters (${typeBreakdown})`;
  })
  .join("\n")}

Top 3 Agents by Inventory:
${agentBreakdown
  .slice(0, 3)
  .map((agent) => {
    if (agent.totalMeters === 0) return null;
    const typeBreakdown = Object.entries<number>(agent.metersByType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ");
    return `• ${agent.name} (${agent.location}): ${agent.totalMeters} meters (${typeBreakdown})`;
  })
  .filter(Boolean)
  .join("\n")}`;
    }

    // If asking about sales
    if (
      lowerMessage.includes("sales") ||
      lowerMessage.includes("sold") ||
      lowerMessage.includes("revenue") ||
      lowerMessage.includes("today") ||
      lowerMessage.includes("yesterday") ||
      lowerMessage.includes("week") ||
      lowerMessage.includes("month") ||
      lowerMessage.includes("recent") ||
      (lowerMessage.includes("last") && !lowerMessage.includes("last week"))
    ) {
      const now = new Date();

      // Calculate date ranges for the entire history
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3); // Get last 3 months of data

      // Get all sales data for the last 3 months
      const { data: salesData } = await supabase
        .from("sale_batches")
        .select(
          `
          *,
          user:user_id (
            name
          )
        `
        )
        .gte("sale_date", threeMonthsAgo.toISOString())
        .order("sale_date", { ascending: false });

      if (salesData) {
        // If asking about recent/last sale
        if (
          lowerMessage.includes("recent") ||
          (lowerMessage.includes("last") && !lowerMessage.includes("last week"))
        ) {
          const mostRecent = salesData[0];
          if (mostRecent) {
            additionalContext = `Most Recent Sale:
• Date: ${formatDate(mostRecent.sale_date)}
• Sold By: ${mostRecent.user_name || mostRecent.user?.name || "Unknown"}
• Meter Type: ${mostRecent.meter_type}
• Quantity: ${mostRecent.batch_amount} meters
• Unit Price: KES ${mostRecent.unit_price.toLocaleString()}
• Total Value: KES ${mostRecent.total_price.toLocaleString()}
• Destination: ${mostRecent.destination}
• Recipient: ${mostRecent.recipient}
• Customer Type: ${mostRecent.customer_type}
• County: ${mostRecent.customer_county}

Last 5 Sales:
${salesData
  .slice(0, 5)
  .map(
    (sale) =>
      `• ${formatDate(sale.sale_date)}: ${sale.batch_amount} ${
        sale.meter_type
      } meters to ${sale.recipient} (KES ${sale.total_price.toLocaleString()})`
  )
  .join("\n")}`;
          }
        } else {
          // Extract date ranges from message for other sales queries
          const dateRanges = extractDateRange(lowerMessage);
          const analysis = await analyzeSalesData(salesData, dateRanges);
          additionalContext = formatSalesAnalysis(analysis);
        }
      }
    }

    const prompt = `${SYSTEM_PROMPT}

Current Context:
${additionalContext}

User Question: ${userMessage}

Important Instructions:
1. Use EXACT numbers from the provided context
2. If data is available in the context, use it - do not say data is unavailable
3. Format all currency values with commas and 'KES' prefix
4. Keep responses concise but informative
5. If asked about specific metrics, include the breakdown if available

Provide a helpful, data-driven response using the specific information provided in the context.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response.text()) {
      throw new Error("No response received from the model");
    }

    return response.text();
  } catch (error) {
    console.error("Error in getChatResponse:", error);
    return "I apologize, but I encountered an error while processing your request. Please try again in a moment.";
  }
}
