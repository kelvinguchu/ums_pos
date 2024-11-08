import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { KENYA_COUNTIES, KenyaCounty, CustomerType } from "@/lib/constants/locationData";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkUserActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_active;
}

// Create a higher-order function to wrap database actions
async function withActiveUserCheck<T>(
  userId: string,
  action: () => Promise<T>
): Promise<T> {
  const isActive = await checkUserActive(userId);
  if (!isActive) {
    throw new Error("ACCOUNT_DEACTIVATED");
  }
  return action();
}

export async function checkMeterExists(serialNumber: string): Promise<boolean> {
  try {
    // First check in meters table
    const { data: metersData, error: metersError } = await supabase
      .from("meters")
      .select("serial_number")
      .eq("serial_number", serialNumber.toUpperCase())
      .maybeSingle();

    if (metersError) throw metersError;

    // Then check in sold_meters table
    const { data: soldData, error: soldError } = await supabase
      .from("sold_meters")
      .select("serial_number")
      .eq("serial_number", serialNumber.toUpperCase())
      .maybeSingle();

    if (soldError) throw soldError;

    // Finally check in agent_inventory table
    const { data: agentData, error: agentError } = await supabase
      .from("agent_inventory")
      .select("serial_number")
      .eq("serial_number", serialNumber.toUpperCase())
      .maybeSingle();

    if (agentError) throw agentError;

    // Return true if meter exists in any of these tables
    return !!(metersData || soldData || agentData);
  } catch (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }
}

export async function signUp(email: string, password: string, role: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  });
  if (error) throw error;
  return { user: data.user, error: null };
}

export async function signIn(email: string, password: string) {
  try {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) throw authError;

    // Check if user is active
    if (authData.user) {
      console.log("User authenticated:", authData.user.id); // Debug log

      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_active")
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error(`Error fetching user profile: ${profileError.message}`);
      }

      console.log("Profiles returned:", profiles); // Debug log

      if (!profiles || profiles.length === 0) {
        throw new Error(`User profile not found for ID: ${authData.user.id}`);
      }

      if (profiles.length > 1) {
        console.error("Multiple profiles found for user");
        throw new Error("Invalid user profile state");
      }

      const profile = profiles[0];

      if (!profile.is_active) {
        // Sign out the user immediately if they're deactivated
        await supabase.auth.signOut();
        throw new Error("ACCOUNT_DEACTIVATED");
      }

      // Return the user data if everything is okay
      return { user: authData.user, session: authData.session, error: null };
    }

    throw new Error("No user data returned");
  } catch (error: any) {
    console.error("SignIn error:", error); // Debug log
    if (error.message === "ACCOUNT_DEACTIVATED") {
      throw error;
    }
    throw new Error(error.message);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_active) {
    await signOut();
    return null;
  }

  return { ...user, role: profile.role };
}

export async function createInvitation(
  email: string,
  role: string,
  invitedBy: string
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const { data, error } = await supabase
    .from("user_invitations")
    .insert({ email, role, invited_by: invitedBy, expires_at: expiresAt });
  if (error) throw error;
  return data;
}

export async function checkInvitation(token: string) {
  const { data, error } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("token", token)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInvitation(email: string) {
  const { error } = await supabase
    .from("user_invitations")
    .delete()
    .eq("email", email);
  if (error) throw error;
}

export async function createUserProfile(userId: string, role: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({ id: userId, role });
  if (error) throw error;
  return data;
}

function generateToken() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function inviteUser(
  email: string,
  role: string,
  invitedBy: string
) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Check if an invitation already exists
  const { data: existingInvitation, error: checkError } = await supabase
    .from("user_invitations")
    .select("*")
    .eq("email", email)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 means no rows returned, which is fine
    throw checkError;
  }

  let data;
  if (existingInvitation) {
    // Update existing invitation
    const { data: updatedData, error: updateError } = await supabase
      .from("user_invitations")
      .update({
        role,
        invited_by: invitedBy,
        invited_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_used: false,
        token,
      })
      .eq("email", email);

    if (updateError) throw updateError;
    data = updatedData;
  } else {
    // Insert new invitation
    const { data: insertedData, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        email,
        role,
        invited_by: invitedBy,
        invited_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_used: false,
        token,
      });

    if (insertError) throw insertError;
    data = insertedData;
  }

  // Send invitation email using Resend
  const response = await fetch("/api/emails/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      role,
      token,
      signupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${token}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to send invitation email:", errorData);
    throw new Error(
      `Failed to send invitation email: ${errorData.message || "Unknown error"}`
    );
  }

  return data;
}

export async function markInvitationAsUsed(token: string) {
  const { error } = await supabase
    .from("user_invitations")
    .update({ is_used: true })
    .eq("token", token);

  if (error) throw error;
}

export async function addMeters(
  meters: Array<{
    serial_number: string;
    type: string;
    added_by: string;
    added_at: string;
    adder_name: string;
  }>
) {
  return withActiveUserCheck(meters[0].added_by, async () => {
    const { data, error } = await supabase.from("meters").insert(meters);
    if (error) throw error;
    return data;
  });
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("name, role, is_active")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function getMeterBySerial(serialNumber: string) {
  // Convert the input to uppercase for consistent comparison
  const normalizedSerial = serialNumber.toUpperCase();

  const { data, error } = await supabase
    .from("meters")
    .select("*")
    .ilike("serial_number", normalizedSerial) // Use ilike for case-insensitive matching
    .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

  if (error) {
    console.error("Error retrieving meter:", error);
    if (error.code === "PGRST116") {
      // No results found
      return null;
    }
    throw error;
  }

  return data;
}

export async function removeMeter(meterId: string) {
  const { error } = await supabase.from("meters").delete().eq("id", meterId);

  if (error) {
    console.error("Error removing meter:", error);
    throw error;
  }
}

// Update the interface for sold meter data
interface SoldMeterData {
  meter_id: string;
  sold_by: string;
  sold_at: string;
  destination: string;
  recipient: string;
  serial_number: string;
  unit_price: number;
  batch_id: string;
  customer_type: CustomerType;
  customer_county: KenyaCounty;
  customer_contact: string;
}

export async function addSoldMeter(soldMeter: SoldMeterData) {
  return withActiveUserCheck(soldMeter.sold_by, async () => {
    const { data, error } = await supabase
      .from("sold_meters")
      .insert(soldMeter);
    if (error) throw error;
    return data;
  });
}

export async function createUser(
  email: string,
  password: string,
  role: string,
  name: string
) {
  const response = await fetch("/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

export async function insertUserProfile(
  userId: string,
  role: string,
  name: string
) {
  const { error } = await supabase.from("user_profiles").insert({
    id: userId,
    role,
    is_active: true,
    name,
  });

  if (error) throw error;
}

export async function getUsersList() {
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("id, name, role, is_active")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name || "N/A",
    role: user.role || "User",
    isActive: user.is_active,
  }));
}

// Update the interface for batch data
interface SaleBatchData {
  user_id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
  customer_type: CustomerType;
  customer_county: KenyaCounty;
  customer_contact: string;
}

export async function addSaleBatch(batchData: SaleBatchData) {
  const { data, error } = await supabase
    .from("sale_batches")
    .insert(batchData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Create a notification for the batch sale
  await createNotification({
    type: "METER_SALE",
    message: `${batchData.user_name} sold ${batchData.batch_amount} ${
      batchData.meter_type
    } meter${batchData.batch_amount > 1 ? "s" : ""} to ${
      batchData.recipient
    } in ${batchData.destination}`,
    metadata: {
      batchId: data.id,
      meterType: batchData.meter_type,
      batchAmount: batchData.batch_amount,
      destination: batchData.destination,
      recipient: batchData.recipient,
      totalPrice: batchData.total_price,
      unitPrice: batchData.unit_price,
      customerType: batchData.customer_type,
      customerCounty: batchData.customer_county,
      customerContact: batchData.customer_contact,
    },
    createdBy: batchData.user_id,
  });

  return data;
}

export async function getSaleBatches() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("*")
    .order("sale_date", { ascending: false });

  if (error) {
    console.error("Error fetching sale batches:", error);
    throw error;
  }

  return data;
}

export async function getMeterCount() {
  const { count, error } = await supabase
    .from("meters")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching meter count:", error);
    return 0;
  }

  return count || 0;
}

export async function getTopSellingUsers() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("user_name, total_price")
    .order("total_price", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching top selling users:", error);
    return [];
  }

  return data.map((item) => ({
    user_name: item.user_name,
    total_sales: item.total_price,
  }));
}

export async function getMostSellingProduct() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("meter_type, batch_amount")
    .order("batch_amount", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching most selling product:", error);
    return "";
  }

  return data[0]?.meter_type || "";
}

export async function getEarningsByMeterType() {
  const { data, error } = await supabase
    .from("sale_batches")
    .select("meter_type, total_price");

  if (error) {
    console.error("Error fetching earnings by meter type:", error);
    return [];
  }

  const earningsByType: { [key: string]: number } = {};
  data.forEach((item) => {
    if (earningsByType[item.meter_type]) {
      earningsByType[item.meter_type] += item.total_price;
    } else {
      earningsByType[item.meter_type] = item.total_price;
    }
  });

  return Object.entries(earningsByType).map(([meter_type, total_earnings]) => ({
    meter_type,
    total_earnings,
  }));
}

export async function getRemainingMetersByType() {
  try {
    const { data, error } = await supabase.from("meters").select("type");

    if (error) {
      console.error("Error fetching remaining meters by type:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const meterCounts: { [key: string]: number } = {};
    data.forEach((meter) => {
      if (meter.type in meterCounts) {
        meterCounts[meter.type]++;
      } else {
        meterCounts[meter.type] = 1;
      }
    });

    const remainingMeters = Object.entries(meterCounts).map(
      ([type, count]) => ({
        type,
        remaining_meters: count,
      })
    );

    return remainingMeters;
  } catch (error) {
    console.error("Unexpected error in getRemainingMetersByType:", error);
    return [];
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    role?: string;
    is_active?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }

  return data;
}

export async function deleteUserProfile(userId: string) {
  const { error: profileError } = await supabase
    .from("user_profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("Error deleting user profile:", profileError);
    throw profileError;
  }

  const response = await fetch("/api/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return true;
}

export async function getMetersByBatchId(batchId: number) {
  const { data, error } = await supabase
    .from("sold_meters")
    .select("serial_number")
    .eq("batch_id", batchId);

  if (error) {
    console.error("Error fetching meters by batch ID:", error);
    throw error;
  }

  return data;
}

export async function getAgentsList() {
  const { data: agents, error } = await supabase
    .from("agents")
    .select(
      `
      *,
      agent_inventory(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agents:", error);
    return [];
  }

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    phone_number: agent.phone_number,
    location: agent.location,
    county: agent.county,
    is_active: agent.is_active,
    total_meters: agent.agent_inventory?.[0]?.count || 0,
  }));
}

export async function updateAgentStatus(agentId: string, isActive: boolean) {
  const { error } = await supabase
    .from("agents")
    .update({ is_active: isActive })
    .eq("id", agentId);

  if (error) throw error;
}

export async function updateAgentDetails(
  agentId: string,
  updates: {
    name?: string;
    phone_number?: string;
    location?: string;
    county?: KenyaCounty;
  }
) {
  // Validate county if it's being updated
  if (updates.county && !KENYA_COUNTIES.includes(updates.county)) {
    throw new Error("Invalid county selected");
  }

  const { error } = await supabase
    .from("agents")
    .update({
      name: updates.name,
      phone_number: updates.phone_number,
      location: updates.location,
      county: updates.county,
    })
    .eq("id", agentId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered to another agent");
    }
    throw error;
  }
}

export async function createAgent(agentData: {
  name: string;
  phone_number: string;
  location: string;
  county: KenyaCounty;
}) {
  // Validate county
  if (!KENYA_COUNTIES.includes(agentData.county)) {
    throw new Error("Invalid county selected");
  }

  const { data, error } = await supabase
    .from("agents")
    .insert({
      ...agentData,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Phone number already registered");
    }
    throw error;
  }

  return data;
}

// Add this new function
export async function assignMetersToAgent({
  agentId,
  meters,
  assignedBy,
}: {
  agentId: string;
  meters: Array<{
    meter_id: string;
    serial_number: string;
    type: string;
  }>;
  assignedBy: string;
}) {
  try {
    // Verify meters exist and are available
    const { data: meterData, error: meterError } = await supabase
      .from("meters")
      .select("*")
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (meterError) throw meterError;

    // Verify agent_inventory table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from("agent_inventory")
      .select("*")
      .limit(1);

    // Prepare inventory data for insertion
    const inventoryData = meters.map((meter) => ({
      agent_id: agentId,
      meter_id: meter.meter_id,
      serial_number: meter.serial_number,
      type: meter.type,
      assigned_at: new Date().toISOString(),
    }));

    // Insert meters into agent_inventory
    const { data: insertedInventory, error: inventoryError } = await supabase
      .from("agent_inventory")
      .insert(inventoryData)
      .select();

    if (inventoryError) throw inventoryError;

    // Verify successful insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from("agent_inventory")
      .select("*")
      .eq("agent_id", agentId)
      .in(
        "meter_id",
        meters.map((m) => m.meter_id)
      );

    // Create transaction records
    const { error: transactionError } = await supabase
      .from("agent_transactions")
      .insert(
        meters.map((meter) => ({
          agent_id: agentId,
          transaction_type: "assignment",
          meter_type: meter.type,
          quantity: 1,
          transaction_date: new Date().toISOString(),
        }))
      );

    if (transactionError) throw transactionError;

    // Remove assigned meters from meters table
    const { error: deleteError } = await supabase
      .from("meters")
      .delete()
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (deleteError) throw deleteError;

    return insertedInventory;
  } catch (error) {
    throw error;
  }
}

export async function getAgentInventory(agentId: string) {
  const { data, error } = await supabase
    .from("agent_inventory")
    .select("*")
    .eq("agent_id", agentId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent inventory:", error);
    throw error;
  }

  return data;
}

export async function removeFromAgentInventory(meterId: string) {
  // Remove meter from agent's inventory
  const { error } = await supabase
    .from("agent_inventory")
    .delete()
    .eq("id", meterId);

  if (error) throw error;
}

export async function deleteAgent(
  agentId: string,
  currentUser: any,
  scannedMeters: string[] = [],
  unscannedMeters: string[] = []
) {
  try {
    // 1. First, delete all agent transactions
    const { error: transactionError } = await supabase
      .from("agent_transactions")
      .delete()
      .eq("agent_id", agentId);

    if (transactionError) throw transactionError;

    // 2. Get all meters assigned to this agent
    const { data: agentMeters, error: inventoryError } = await supabase
      .from("agent_inventory")
      .select("*")
      .eq("agent_id", agentId);

    if (inventoryError) throw inventoryError;

    if (agentMeters && agentMeters.length > 0) {
      // 3. Handle scanned meters - move them back to meters table
      const metersToRestore = agentMeters
        .filter((meter) => scannedMeters.includes(meter.serial_number))
        .map((meter) => ({
          serial_number: meter.serial_number,
          type: meter.type,
          added_by: currentUser.id,
          added_at: new Date().toISOString(),
          adder_name: currentUser.name || currentUser.email,
        }));

      if (metersToRestore.length > 0) {
        const { error: restoreError } = await supabase
          .from("meters")
          .insert(metersToRestore);

        if (restoreError) throw restoreError;
      }

      // 4. Delete all meters from agent_inventory
      const { error: deleteInventoryError } = await supabase
        .from("agent_inventory")
        .delete()
        .eq("agent_id", agentId);

      if (deleteInventoryError) throw deleteInventoryError;
    }

    // 5. Finally delete the agent
    const { error: deleteAgentError } = await supabase
      .from("agents")
      .delete()
      .eq("id", agentId);

    if (deleteAgentError) throw deleteAgentError;

    return {
      restoredCount: scannedMeters.length,
      deletedCount: unscannedMeters.length,
    };
  } catch (error) {
    console.error("Error in deleteAgent:", error);
    throw error;
  }
}

export async function superSearchMeter(searchTerm: string) {
  if (!searchTerm || searchTerm.length < 0) return [];

  const { data: results, error } = await supabase
    .from("meters")
    .select("serial_number, type")
    .ilike("serial_number", `%${searchTerm}%`)
    .limit(5);

  const { data: agentMeters } = await supabase
    .from("agent_inventory")
    .select(
      `
      serial_number,
      type,
      agents (
        id,
        name,
        location
      )
    `
    )
    .ilike("serial_number", `%${searchTerm}%`)
    .limit(5);

  // Update the sold meters query with proper joins
  const { data: soldMeters } = await supabase
    .from("sold_meters")
    .select(
      `
      serial_number,
      sold_at,
      sold_by,
      destination,
      recipient,
      unit_price,
      batch_id,
      sale_batches!inner (
        id,
        user_name,
        meter_type,
        batch_amount,
        total_price,
        sale_date
      ),
      seller:user_profiles!sold_by (
        name,
        role
      )
    `
    )
    .ilike("serial_number", `%${searchTerm}%`)
    .limit(5);

  if (error) throw error;

  const formattedResults = [
    ...(results?.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: "in_stock",
    })) || []),
    ...(agentMeters?.map((meter) => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: "with_agent",
      agent: meter.agents,
    })) || []),
    ...(soldMeters?.map((meter: any) => ({
      serial_number: meter.serial_number,
      status: "sold",
      sale_details: {
        sold_at: meter.sale_batches[0]?.sale_date || meter.sold_at,
        sold_by: meter.sale_batches[0]?.user_name,
        seller_name: meter.seller?.name, 
        seller_role: meter.seller?.role, 
        destination: meter.destination,
        recipient: meter.recipient,
        unit_price: meter.unit_price,
        batch_id: meter.batch_id,
        meter_type: meter.sale_batches[0]?.meter_type,
        batch_amount: meter.sale_batches[0]?.batch_amount,
        total_price: meter.sale_batches[0]?.total_price,
      },
    })) || []),
  ];

  return formattedResults;
}


// Create a new notification
export async function createNotification({
  type,
  message,
  metadata,
  createdBy,
}: {
  type: string;
  message: string;
  metadata?: any;
  createdBy: string;
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      type,
      message,
      metadata,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating notification:", error);
    throw error;
  }

  return data;
}

// Fetch notifications for a user
export async function getNotifications(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }

  // Process notifications to determine read status for this specific user
  return data.map((notification) => ({
    ...notification,
    is_read: notification.read_by?.includes(userId) || false,
  }));
}

// Mark a notification as read
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  // First get the current notification
  const { data: notification } = await supabase
    .from("notifications")
    .select("read_by")
    .eq("id", notificationId)
    .single();

  // Create new read_by array with the userId
  const readBy = Array.isArray(notification?.read_by)
    ? notification.read_by
    : [];
  if (!readBy.includes(userId)) {
    readBy.push(userId);
  }

  // Update the notification
  const { error } = await supabase
    .from("notifications")
    .update({
      read_by: readBy,
      // Only mark as globally read if all users have read it
      is_read: false,
    })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string) {
  // First get all notifications that this user hasn't read yet
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, read_by")
    .filter("read_by", "not.cs", `{${userId}}`); // Use containment operator to check array

  if (!notifications || notifications.length === 0) return;

  // Update each notification
  const updates = notifications.map((notification) => {
    const readBy = Array.isArray(notification.read_by)
      ? notification.read_by
      : [];
    if (!readBy.includes(userId)) {
      readBy.push(userId);
    }

    return supabase
      .from("notifications")
      .update({
        read_by: readBy,
        // Keep is_read as false since other users might not have read it
        is_read: false,
      })
      .eq("id", notification.id);
  });

  try {
    await Promise.all(updates);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// Subscribe to new notifications
export function subscribeToNotifications(
  callback: (notification: any) => void
) {
  return supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}

export async function checkMultipleSerialNumbers(
  serialNumbers: string[]
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("meters")
      .select("serial_number")
      .in("serial_number", serialNumbers);

    if (error) {
      console.error("Error checking serial numbers:", error);
      throw error;
    }

    // Return array of existing serial numbers
    return data ? data.map((meter) => meter.serial_number) : [];
  } catch (error) {
    console.error("Error checking serial numbers:", error);
    throw error;
  }
}
