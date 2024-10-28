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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
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
    fontSize: 12,
    color: '#000080',
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
  destinationInfo: {
    marginBottom: 10,
    fontSize: 12,
    color: '#000080',
  }
});

interface MeterSalesReceiptProps {
  meters: Array<{
    serialNumber: string;
    type: string;
  }>;
  destination: string;
  recipient: string;
  unitPrices: { [key: string]: string };
  userName: string;
}

const MeterSalesReceipt = ({ meters, destination, recipient, unitPrices, userName }: MeterSalesReceiptProps) => {
  const metersByType = meters.reduce((acc: { [key: string]: typeof meters }, meter) => {
    if (!acc[meter.type]) acc[meter.type] = [];
    acc[meter.type].push(meter);
    return acc;
  }, {});

  const totalAmount = Object.entries(metersByType).reduce((total, [type, typeMeters]) => {
    return total + (typeMeters.length * parseFloat(unitPrices[type] || '0'));
  }, 0);

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

        <Text style={styles.title}>Meter Sales Receipt</Text>
        
        <View style={styles.destinationInfo}>
          <Text>Destination: {destination}</Text>
          <Text>Recipient: {recipient}</Text>
          <Text>Sold By: {userName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Summary</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeaderCell}>Description</Text>
              <Text style={styles.tableHeaderCell}>Value</Text>
            </View>
            {Object.entries(metersByType).map(([type, typeMeters]) => (
              <View key={type} style={styles.tableRow}>
                <Text style={styles.tableCell}>
                  {type.charAt(0).toUpperCase() + type.slice(1)} Meters ({typeMeters.length})
                </Text>
                <Text style={styles.tableCell}>
                  {typeMeters.length} × {unitPrices[type]} = {(typeMeters.length * parseFloat(unitPrices[type] || '0')).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Total Meters</Text>
              <Text style={styles.tableCell}>{meters.length}</Text>
            </View>
            {Object.entries(unitPrices).map(([type, price]) => (
              <View key={type} style={styles.tableRow}>
                <Text style={styles.tableCell}>Unit Price ({type})</Text>
                <Text style={styles.tableCell}>{price}</Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { color: '#E46020', fontWeight: 'bold' }]}>
                Total Amount
              </Text>
              <Text style={[styles.tableCell, { color: '#E46020', fontWeight: 'bold' }]}>
                {totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          UMS Prepaid Kenya • Generated on {currentDateTime}
        </Text>
      </Page>
    </Document>
  );
};

export default MeterSalesReceipt;
