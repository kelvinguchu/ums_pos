import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register the font
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
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'left',
    color: '#000080', // Navy blue brand color
  },
  dateTime: {
    fontSize: 12,
    marginBottom: 20,
    color: '#000080', // Navy blue for dates
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000080', // Navy blue for borders
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000080', // Navy blue for row borders
  },
  tableHeader: {
    backgroundColor: '#000080', // Navy blue background for header
  },
  tableHeaderCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    color: 'white', // White text for header
  },
  tableCell: {
    padding: 8,
    flex: 1,
    fontSize: 12,
    color: '#000080', // Navy blue for cell text
  },
  total: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E46020', // Orange brand color for total
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#E46020', // Orange for footer
  },
});

interface MeterCount {
  type: string;
  count: number;
}

interface MeterAdditionReceiptProps {
  meterCounts: MeterCount[];
  adderName: string;
}

const MeterAdditionReceipt = ({ meterCounts, adderName }: MeterAdditionReceiptProps) => {
  const totalMeters = meterCounts.reduce((acc, curr) => acc + curr.count, 0);
  const currentDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image 
            src="/logo.png"
            style={styles.logo}
          />
          <Text style={styles.dateTime}>{currentDateTime}</Text>
        </View>

        <Text style={styles.title}>Meter Addition Receipt</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableHeaderCell}>Meter Type</Text>
            <Text style={styles.tableHeaderCell}>Quantity</Text>
          </View>
          {meterCounts.map((meter, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>
                {meter.type.charAt(0).toUpperCase() + meter.type.slice(1)}
              </Text>
              <Text style={styles.tableCell}>{meter.count}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Total Meters Added: {totalMeters}</Text>
        <Text style={styles.dateTime}>Added By: {adderName}</Text>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default MeterAdditionReceipt;
