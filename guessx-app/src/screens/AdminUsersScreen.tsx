import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native'
import { Shield, User, Search, X, ChevronRight, ArrowUpCircle, ArrowDownCircle, Phone, Wallet, Trophy, TrendingUp, AlertCircle } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, CTAButton, Card } from '../components/AuctionUI'
import { formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'
import { api, type ApiUser, type ApiBidderHistory } from '../api'

function UserDetailModal({ visible, user, onClose, onRoleChange }: { visible: boolean; user: ApiUser | null; onClose: () => void; onRoleChange: (id: string, role: string) => void }) {
  const { allBids } = useApp()
  const [history, setHistory] = useState<ApiBidderHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!user) {
      setHistory(null)
      return
    }
    setLoadingHistory(true)
    api.adminGetBidderHistory(user.id)
      .then((res) => setHistory(res))
      .catch(() => setHistory(null))
      .finally(() => setLoadingHistory(false))
  }, [user?.id])

  if (!user) return null
  const userBids = allBids.filter((b) => b.userId === user.id)
  const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
  const isAdmin = user.role === 'admin'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>User Details & Bidder History</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={18} color={colors.mutedForeground} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: isAdmin ? colors.primary + '33' : colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
                {isAdmin ? <Shield size={24} color={colors.primary} /> : <User size={24} color={colors.navy} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>{user.full_name || 'Unknown'}</Text>
                  {isAdmin && <Badge tone="orange">Admin</Badge>}
                </View>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>ID: {user.id.slice(0, 12)}...</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                <Phone size={14} color={colors.mutedForeground} />
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 }}>Phone</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 2 }}>{user.phone_number}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 12 }}>
                <Wallet size={14} color={colors.mutedForeground} />
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 }}>Wallet</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 2 }}>{formatCurrency(user.wallet_balance)}</Text>
              </View>
            </View>

            {/* Bidder History & Compliance Section */}
            <View style={{ marginBottom: 16, borderRadius: 12, backgroundColor: colors.secondary + '66', borderWidth: 1, borderColor: colors.border, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>
                Bidder Compliance & Escalation History
              </Text>
              {loadingHistory ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: (history?.stats.compliance_rate ?? 100) >= 80 ? '#10b981' : '#ef4444' }}>
                      {history ? `${history.stats.compliance_rate}%` : '100%'}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.mutedForeground }}>Compliance</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy }}>
                      {history?.stats.auctions_won ?? 0}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.mutedForeground }}>Won</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: (history?.stats.payments_defaulted ?? 0) > 0 ? '#ef4444' : colors.navy }}>
                      {history?.stats.payments_defaulted ?? 0}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.mutedForeground }}>Defaults</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                      {history?.stats.total_bids ?? userBids.length}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: colors.mutedForeground }}>Total Bids</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: colors.navy + '0D', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>{userBids.length}</Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>Bids</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.primary + '1A', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{uniqueAuctions}</Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>Auctions</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.emerald50 + '80', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.emerald700 }}>{user.role}</Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>Role</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  isAdmin ? 'Demote User' : 'Promote User',
                  `${isAdmin ? 'Remove admin privileges from' : 'Grant admin privileges to'} ${user.full_name || user.phone_number}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: isAdmin ? 'Demote' : 'Promote', onPress: () => onRoleChange(user.id, isAdmin ? 'user' : 'admin') },
                  ]
                )
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 12, paddingVertical: 12,
                backgroundColor: isAdmin ? colors.destructive + '14' : colors.primary,
              }}
            >
              {isAdmin ? <ArrowDownCircle size={16} color={colors.destructive} /> : <ArrowUpCircle size={16} color={colors.white} />}
              <Text style={{ fontSize: 13, fontWeight: '700', color: isAdmin ? colors.destructive : colors.white }}>
                {isAdmin ? 'Demote to User' : 'Promote to Admin'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function AdminUsersScreen() {
  const { go, goBack, allBids } = useApp()
  const [userList, setUserList] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    setError(null)
    api.adminListUsers(1, 200)
      .then((res) => setUserList(res.data))
      .catch((e) => setError((e instanceof Error ? e.message : String(e)) || 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchUsers, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return userList
    const q = search.toLowerCase().trim()
    return userList.filter((u) => u.full_name?.toLowerCase().includes(q) || u.phone_number?.includes(q) || u.id?.toLowerCase().includes(q))
  }, [userList, search])

  const [displayCount, setDisplayCount] = useState(15)
  const paginatedUsers = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount])

  useEffect(() => {
    setDisplayCount(15)
  }, [search])

  const adminCount = userList.filter((u) => u.role === 'admin').length
  const totalBids = allBids.length

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.updateUser(id, { role: newRole })
      setUserList((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)))
      setSelectedUser((prev) => prev?.id === id ? { ...prev, role: newRole } : prev)
    } catch {
      Alert.alert('Error', 'Failed to update user role')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Manage Users" onBack={goBack} />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
        <Card style={s.searchRow}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
            style={s.searchInput}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </Card>
      </View>
      <Card style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 12, padding: 12 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>{loading ? '...' : userList.length}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Users</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{adminCount}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Admins</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.emerald600 }}>{totalBids}</Text>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Total Bids</Text>
        </View>
      </Card>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginTop: 12 }}>Loading users...</Text>
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <AlertCircle size={32} color={colors.destructive} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.destructive, marginTop: 12 }}>{error}</Text>
            <TouchableOpacity onPress={fetchUsers} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Search size={32} color={colors.mutedForeground + '66'} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 12 }}>
              {search ? 'No users match your search' : 'No users found'}
            </Text>
          </View>
        ) : (
          paginatedUsers.map((u) => {
            const userBids = allBids.filter((b) => b.userId === u.id)
            const isAdmin = u.role === 'admin'
            const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
            return (
              <TouchableOpacity key={u.id} onPress={() => setSelectedUser(u)} style={s.row}>
                <View style={[s.avatar, { backgroundColor: isAdmin ? colors.primary + '33' : colors.secondary }]}>
                  {isAdmin ? <Shield size={20} color={colors.primary} /> : <User size={20} color={colors.navy} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.name}>{u.full_name || u.phone_number}</Text>
                    {isAdmin && <Badge tone="orange">Admin</Badge>}
                  </View>
                  <Text style={s.meta}>{u.phone_number}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={s.stat}>{userBids.length} bids</Text>
                    <Text style={s.stat}>{uniqueAuctions} auctions</Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )
          })
        )}

        {filtered.length > displayCount && (
          <TouchableOpacity
            onPress={() => setDisplayCount((prev) => prev + 15)}
            style={{
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginVertical: 8,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
              Load More Users ({filtered.length - displayCount} remaining)
            </Text>
          </TouchableOpacity>
        )}

        {filtered.length > 0 && (
          <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.secondary, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, textAlign: 'center' }}>
              Showing {Math.min(displayCount, filtered.length)} of {filtered.length} matching users
            </Text>
          </View>
        )}
      </ScrollView>

      <UserDetailModal visible={!!selectedUser} user={selectedUser} onClose={() => setSelectedUser(null)} onRoleChange={handleRoleChange} />
    </View>
  )
}


const s = StyleSheet.create({
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.navy, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  stat: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
})
