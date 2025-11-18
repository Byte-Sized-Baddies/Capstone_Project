// apps/mobile/components/OverviewCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress'; // npm install react-native-progress

// A reusable Card component
const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.card}>{children}</View>
);

export function OverviewCard() {
    const completed = 0;
    const total = 0;
    const progress = total > 0 ? completed / total : 0;

    return (
        <Card>
            <Text style={styles.cardTitle}>Overview</Text>
            <Text style={styles.cardSubtitle}>
                {completed} of {total} tasks completed
            </Text>
            <Progress.Bar
                progress={progress}
                width={null} // null fills the container
                color="#3b82f6"
                unfilledColor="#e5e7eb"
                borderWidth={0}
                height={8}
                style={{ marginTop: 12 }}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
});