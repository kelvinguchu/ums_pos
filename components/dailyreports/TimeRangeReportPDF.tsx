import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

Font.register({
  family: 'GeistMono',
  src: '/fonts/GeistMonoVF.woff'
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'GeistMono',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000080',
  },
  dateRange: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  summarySection: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000080',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statBox: {
    width: '50%',
    padding: 10,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000080',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000080',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000080',
  },
  tableHeader: {
    backgroundColor: '#000080',
  },
  tableHeaderCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    color: 'white',
  },
  tableCell: {
    padding: 8,
    flex: 1,
    fontSize: 10,
  },
  totalRow: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#000080',
  },
  totalCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000080',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#000080',
  },
});

interface TimeRangeReportPDFProps {
  sales: any[];
  dateRange: {
    startDate: Date;
    endDate: Date;
    label: string;
  };
  metrics: {
    totalSales: number;
    averageDailySales: number;
    totalMeters: number;
    metersByType: { [key: string]: number };
  };
  remainingMetersByType: any[];
  agentInventory: any[];
}

const METER_TYPES = ['integrated', 'split', 'gas', 'water', 'smart', '3 phase'] as const;

const TimeRangeReportPDF = ({ sales, dateRange, metrics, remainingMetersByType, agentInventory }: TimeRangeReportPDFProps) => {
  const getAgentCount = (meterType: string) => {
    const inventory = agentInventory.find(item => 
      item.type.toLowerCase() === meterType.toLowerCase()
    );
    return inventory?.with_agents || 0;
  };

  const allMeterTypes = METER_TYPES.map(type => {
    const existingData = remainingMetersByType.find(
      item => item.type.toLowerCase() === type.toLowerCase()
    );
    return {
      type,
      remaining: existingData?.remaining_meters || 0,
      withAgents: getAgentCount(type),
      soldInPeriod: metrics.metersByType[type] || 0
    };
  });

  const totals = {
    remaining: allMeterTypes.reduce((sum, item) => sum + item.remaining, 0),
    withAgents: allMeterTypes.reduce((sum, item) => sum + item.withAgents, 0),
    soldInPeriod: allMeterTypes.reduce((sum, item) => sum + item.soldInPeriod, 0)
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <Text>{format(new Date(), "dd/MM/yyyy HH:mm:ss")}</Text>
        </View>

        <Text style={styles.title}>{dateRange.label}</Text>
        <Text style={styles.dateRange}>
          Period: {format(dateRange.startDate, "dd/MM/yyyy")} - {format(dateRange.endDate, "dd/MM/yyyy")}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Sales</Text>
            <Text style={styles.statValue}>KES {metrics.totalSales.toLocaleString()}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Average Daily Sales</Text>
            <Text style={styles.statValue}>KES {metrics.averageDailySales.toLocaleString()}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Meters Sold</Text>
            <Text style={styles.statValue}>{metrics.totalMeters}</Text>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Meters Status by Type</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={styles.tableHeaderCell}>In Stock</Text>
              <Text style={styles.tableHeaderCell}>With Agents</Text>
              <Text style={styles.tableHeaderCell}>Sold in Period</Text>
              <Text style={styles.tableHeaderCell}>Total Available</Text>
            </View>
            {allMeterTypes.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.type}</Text>
                <Text style={styles.tableCell}>{item.remaining}</Text>
                <Text style={styles.tableCell}>{item.withAgents}</Text>
                <Text style={styles.tableCell}>{item.soldInPeriod}</Text>
                <Text style={styles.tableCell}>{item.remaining + item.withAgents}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.totalCell}>Total</Text>
              <Text style={styles.totalCell}>{totals.remaining}</Text>
              <Text style={styles.totalCell}>{totals.withAgents}</Text>
              <Text style={styles.totalCell}>{totals.soldInPeriod}</Text>
              <Text style={styles.totalCell}>{totals.remaining + totals.withAgents}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Daily Sales Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Date</Text>
              <Text style={styles.tableHeaderCell}>Total Sales</Text>
              <Text style={styles.tableHeaderCell}>Meters Sold</Text>
            </View>
            {/* Group sales by date and show daily totals */}
            {Object.entries(
              sales.reduce((acc: any, sale) => {
                const date = format(new Date(sale.sale_date), "dd/MM/yyyy");
                if (!acc[date]) {
                  acc[date] = { totalSales: 0, metersSold: 0 };
                }
                acc[date].totalSales += sale.total_price;
                acc[date].metersSold += sale.batch_amount;
                return acc;
              }, {})
            ).map(([date, data]: [string, any], index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{date}</Text>
                <Text style={styles.tableCell}>KES {data.totalSales.toLocaleString()}</Text>
                <Text style={styles.tableCell}>{data.metersSold}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • {dateRange.label} Generated on {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
        </Text>
      </Page>
    </Document>
  );
};

export default TimeRangeReportPDF;
