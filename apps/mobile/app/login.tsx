import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useAuth } from "../context/auth";

export default function LoginScreen() {
    const { login, signUp } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setAuthLoading(true);
        try {
            if (isLogin) {
                await login({ email, password });
            } else {
                await signUp({ name, email, password });
                Alert.alert("Success", "Account created! You can now log in.");
                setIsLogin(true);
            }
        } catch (error: any) {
            Alert.alert("Auth Error", error.message || "Something went wrong");
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.inner}>
                <Text style={styles.logo}>🐝</Text>
                <Text style={styles.title}>{isLogin ? "Welcome Back" : "Join the Hive"}</Text>
                <Text style={styles.subtitle}>
                    {isLogin ? "Log in to manage your tasks" : "Create an account to start bee-ing productive"}
                </Text>

                <View style={styles.form}>
                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleSubmit}
                        disabled={authLoading}
                    >
                        {authLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isLogin ? "Log In" : "Sign Up"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setIsLogin(!isLogin)}
                        style={styles.switchButton}
                    >
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f4f7",
    },
    inner: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 30,
    },
    logo: {
        fontSize: 60,
        textAlign: "center",
        marginBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
        color: "#111",
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
        marginTop: 5,
    },
    form: {
        gap: 15,
    },
    input: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    button: {
        backgroundColor: "#FACC15", // Do-Bee Yellow
        padding: 15,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
    },
    switchButton: {
        marginTop: 15,
        alignItems: "center",
    },
    switchText: {
        color: "#6366F1",
        fontSize: 14,
        fontWeight: "500",
    },
});