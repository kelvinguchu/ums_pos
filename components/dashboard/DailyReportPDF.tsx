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
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000080',
  },
  summarySection: {
    marginBottom: 20,
  },
  comparisonText: {
    fontSize: 12,
    marginBottom: 5,
  },
  highlightedText: {
    fontSize: 12,
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
    color: 'black',
  },
  totalRow: {
    backgroundColor: '#f8f9fa',
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

interface DailyReportPDFProps {
  todaySales: any[];
  yesterdaySales: any[];
  remainingMetersByType: any[];
  todayTotalEarnings: number;
  yesterdayTotalEarnings: number;
}

// Add this interface for better type safety
interface MetersSoldByType {
  [key: string]: number;
}

const DailyReportPDF = ({ 
  todaySales, 
  yesterdaySales, 
  remainingMetersByType,
  todayTotalEarnings,
  yesterdayTotalEarnings 
}: DailyReportPDFProps) => {
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");
  
  // Calculate metrics
  const salesGrowth = ((todayTotalEarnings - yesterdayTotalEarnings) / yesterdayTotalEarnings) * 100;
  const salesGrowthText = `${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(2)}%`;
  
  // Calculate meters sold by type for today with proper typing
  const metersSoldByType = todaySales.reduce<MetersSoldByType>((acc, sale) => {
    acc[sale.meter_type] = (acc[sale.meter_type] || 0) + sale.batch_amount;
    return acc;
  }, {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <Text>{currentDateTime}</Text>
        </View>

        <Text style={styles.title}>Daily Sales Report</Text>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Daily Performance Summary</Text>
          <Text style={styles.comparisonText}>
            Today's Total Sales: <Text style={styles.highlightedText}>KES {todayTotalEarnings.toLocaleString()}</Text>
          </Text>
          <Text style={styles.comparisonText}>
            Yesterday's Total Sales: KES {yesterdayTotalEarnings.toLocaleString()}
          </Text>
          <Text style={styles.comparisonText}>
            Sales Growth: <Text style={styles.highlightedText}>{salesGrowthText}</Text>
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Meters Inventory Status</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Meter Type</Text>
              <Text style={styles.tableHeaderCell}>Sold Today</Text>
              <Text style={styles.tableHeaderCell}>Remaining</Text>
            </View>
            {remainingMetersByType.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.type}</Text>
                <Text style={styles.tableCell}>{metersSoldByType[item.type] || 0}</Text>
                <Text style={styles.tableCell}>{item.remaining_meters}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={styles.totalCell}>Total</Text>
              <Text style={styles.totalCell}>
                {Object.values(metersSoldByType).reduce((a, b) => a + b, 0).toString()}
              </Text>
              <Text style={styles.totalCell}>
                {remainingMetersByType.reduce((sum, item) => sum + item.remaining_meters, 0).toString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.subtitle}>Detailed Sales Transactions</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Seller</Text>
              <Text style={styles.tableHeaderCell}>Type</Text>
              <Text style={styles.tableHeaderCell}>Amount</Text>
              <Text style={styles.tableHeaderCell}>Total Price</Text>
              <Text style={styles.tableHeaderCell}>Time</Text>
            </View>
            {todaySales.map((sale, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{sale.user_name}</Text>
                <Text style={styles.tableCell}>{sale.meter_type}</Text>
                <Text style={styles.tableCell}>{sale.batch_amount}</Text>
                <Text style={styles.tableCell}>KES {sale.total_price.toLocaleString()}</Text>
                <Text style={styles.tableCell}>
                  {format(new Date(sale.sale_date), "HH:mm:ss")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Daily Report Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default DailyReportPDF;
