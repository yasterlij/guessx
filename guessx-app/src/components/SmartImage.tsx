import { useState, useEffect, useRef } from "react";
import { View, Image, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Gavel } from "lucide-react-native";

type SmartImageProps = {
  uri?: string;
  alt?: string;
  style?: any;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
};

export function SmartImage({ uri, alt = "", style, resizeMode = "cover" }: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setStatus("loading");
    setRetryCount(0);
    return () => { mountedRef.current = false; };
  }, [uri]);

  const handleError = () => {
    if (retryCount < 1 && mountedRef.current) {
      setRetryCount(c => c + 1);
      setStatus("loading");
    } else if (mountedRef.current) {
      setStatus("error");
    }
  };

  if (!uri || status === "error") {
    return (
      <View style={[styles.fallback, style]}>
        <Gavel size={32} color="#C8A642" opacity={0.4} />
        {alt ? <Text style={styles.fallbackText}>{alt}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {status === "loading" && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#C8A642" />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, status === "loaded" ? styles.loaded : styles.loading]}
        resizeMode={resizeMode}
        onLoad={() => mountedRef.current && setStatus("loaded")}
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loaded: {
    opacity: 1,
  },
  loading: {
    opacity: 0,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  fallbackText: {
    fontSize: 10,
    color: "#A3A3A3",
    marginTop: 4,
  },
});