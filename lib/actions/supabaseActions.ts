import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
  const { data, error } = await supabase
    .from("meters")
    .select("id")
    .eq("serial_number", serialNumber);

  if (error) {
    console.error("Error checking meter existence:", error);
    throw error;
  }

  return data.length > 0;
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
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.is_active) {
        // Sign out the user immediately if they're deactivated
        await supabase.auth.signOut();
        throw new Error("ACCOUNT_DEACTIVATED");
      }

      // Return the user data if everything is okay
      return { user: authData.user, session: authData.session, error: null };
    }

    throw new Error("No user data returned");
  } catch (error: any) {
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
  const { data, error } = await supabase
    .from("meters")
    .select("*")
    .eq("serial_number", serialNumber)
    .single();

  if (error) {
    console.error("Error retrieving meter:", error);
    return null;
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

export async function addSoldMeter(soldMeter: {
  meter_id: string;
  sold_by: string;
  sold_at: string;
  destination: string;
  recipient: string;
  serial_number: string;
  unit_price: number;
  batch_id: string;
}) {
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

export async function addSaleBatch(batchData: {
  user_id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
}) {
  console.log("Adding sale batch with data:", batchData);
  const { data, error } = await supabase
    .from('sale_batches')
    .insert(batchData)
    .select()
    .single();

  if (error) {
    console.error("Error adding sale batch:", error);
    throw error;
  }

  console.log("Sale batch added successfully:", data);
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

    console.log("Meter counts:", meterCounts);

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
  }
) {
  const { error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", agentId);

  if (error) throw error;
}

export async function createAgent(agentData: {
  name: string;
  phone_number: string;
  location: string;
}) {
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
  console.log("Starting assignMetersToAgent in supabaseActions...");
  console.log("Input data:", { agentId, meters, assignedBy });

  try {
    // First, verify meters exist and are available
    const { data: meterData, error: meterError } = await supabase
      .from("meters")
      .select("*")
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (meterError) {
      console.error("Meter verification error:", meterError);
      throw meterError;
    }

    // Verify agent_inventory table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from("agent_inventory")
      .select("*")
      .limit(1);

    console.log("Table Info:", tableInfo, "Table Error:", tableError);

    // Insert into agent_inventory first
    const inventoryData = meters.map((meter) => ({
      agent_id: agentId,
      meter_id: meter.meter_id,
      serial_number: meter.serial_number,
      type: meter.type,
      assigned_at: new Date().toISOString(),
    }));

    console.log("Inserting into agent_inventory:", inventoryData);

    const { data: insertedInventory, error: inventoryError } = await supabase
      .from("agent_inventory")
      .insert(inventoryData)
      .select();

    if (inventoryError) {
      console.error("Inventory insertion error:", inventoryError);
      throw inventoryError;
    }

    console.log(
      "Successfully inserted into agent_inventory:",
      insertedInventory
    );

    // Verify the insertion with a select
    const { data: verifyData, error: verifyError } = await supabase
      .from("agent_inventory")
      .select("*")
      .eq("agent_id", agentId)
      .in(
        "meter_id",
        meters.map((m) => m.meter_id)
      );

    console.log(
      "Verification select result:",
      verifyData,
      "Verify Error:",
      verifyError
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

    if (transactionError) {
      console.error("Transaction record error:", transactionError);
      throw transactionError;
    }

    // Finally, delete from meters table
    const { error: deleteError } = await supabase
      .from("meters")
      .delete()
      .in(
        "id",
        meters.map((m) => m.meter_id)
      );

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    console.log("Assignment completed successfully");
    return insertedInventory;
  } catch (error) {
    console.error("Error in assignMetersToAgent:", error);
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
  console.log("Removing meter from agent inventory:", meterId);
  const { error } = await supabase
    .from('agent_inventory')
    .delete()
    .eq('id', meterId);

  if (error) {
    console.error("Error removing meter from agent inventory:", error);
    throw error;
  }
  console.log("Meter removed from agent inventory successfully");
}

export async function deleteAgent(
  agentId: string, 
  currentUser: any, 
  scannedMeters: string[] = [], 
  unscannedMeters: string[] = []
) {
  // Get all meters assigned to this agent
  const { data: agentMeters, error: inventoryError } = await supabase
    .from('agent_inventory')
    .select('*')
    .eq('agent_id', agentId);

  if (inventoryError) throw inventoryError;

  if (agentMeters && agentMeters.length > 0) {
    // Handle scanned meters - move them back to meters table
    const metersToRestore = agentMeters
      .filter(meter => scannedMeters.includes(meter.serial_number))
      .map(meter => ({
        serial_number: meter.serial_number,
        type: meter.type,
        added_by: currentUser.id,
        added_at: new Date().toISOString(),
        adder_name: currentUser.name || currentUser.email,
      }));

    if (metersToRestore.length > 0) {
      const { error: restoreError } = await supabase
        .from('meters')
        .insert(metersToRestore);

      if (restoreError) throw restoreError;
    }

    // Delete all meters from agent_inventory
    const { error: deleteInventoryError } = await supabase
      .from('agent_inventory')
      .delete()
      .eq('agent_id', agentId);

    if (deleteInventoryError) throw deleteInventoryError;
  }

  // Finally delete the agent
  const { error: deleteAgentError } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId);

  if (deleteAgentError) throw deleteAgentError;

  return {
    restoredCount: scannedMeters.length,
    deletedCount: unscannedMeters.length
  };
}

export async function superSearchMeter(searchTerm: string) {
  if (!searchTerm || searchTerm.length < 2) return [];

  const { data: results, error } = await supabase
    .from('meters')
    .select('serial_number, type')
    .ilike('serial_number', `%${searchTerm}%`)
    .limit(5);

  const { data: agentMeters } = await supabase
    .from('agent_inventory')
    .select(`
      serial_number,
      type,
      agents (
        id,
        name,
        location
      )
    `)
    .ilike('serial_number', `%${searchTerm}%`)
    .limit(5);

  const { data: soldMeters } = await supabase
    .from('sold_meters')
    .select('serial_number')
    .ilike('serial_number', `%${searchTerm}%`)
    .limit(5);

  if (error) throw error;

  const formattedResults = [
    ...(results?.map(meter => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: 'in_stock'
    })) || []),
    ...(agentMeters?.map(meter => ({
      serial_number: meter.serial_number,
      type: meter.type,
      status: 'with_agent',
      agent: meter.agents
    })) || []),
    ...(soldMeters?.map(meter => ({
      serial_number: meter.serial_number,
      status: 'sold'
    })) || [])
  ];

  return formattedResults;
}

// Add this RPC to your Supabase SQL editor:
/*
CREATE OR REPLACE VIEW meters_view AS
  SELECT 
    serial_number,
    type,
    'in_stock' as status,
    NULL as agent_id
  FROM meters
  UNION ALL
  SELECT 
    ai.serial_number,
    ai.type,
    'with_agent' as status,
    ai.agent_id
  FROM agent_inventory ai
  UNION ALL
  SELECT 
    sm.serial_number,
    NULL as type,
    'sold' as status,
    NULL as agent_id
  FROM sold_meters sm;
*/
