import { SafeAreaView, Text, View, ScrollView } from "react-native";
import { COLORS } from "@/constants/colors";
import TextButton from "@/components/text-button";
import Card from "@/components/card";
import ProfileButton from "@/components/profile-button";

export default function History() {
  return (
    <SafeAreaView>
      <View
        style={{
          display: "flex",
          padding: 24,
          gap: 20,
        }}
      >
        <ScrollView>
          <View
            style={{
              display: "flex",
              gap: 20,
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "MonaSans-Bold",
                  fontSize: 24,
                }}
              >
                Locker History
              </Text>
              <ProfileButton />
            </View>
            <View
              style={{
                display: "flex",
                gap: 20,
              }}
            >
              <Card
                location="UB Central Library"
                locker="B05"
                time="11:50 - Now (2hrs 20 min)"
              >
                <TextButton
                  style={{
                    backgroundColor: COLORS.text,
                  }}
                  textStyle={{
                    color: COLORS.primary,
                  }}
                >
                  Regain Access
                </TextButton>
              </Card>
              <Card
                location="TP Ground Floor"
                locker="T22"
                date="31st August 2025"
                time="11:50 - 14:10 (2hrs 20 min)"
              >
                <TextButton
                  style={{
                    backgroundColor: COLORS.text,
                  }}
                  textStyle={{
                    color: COLORS.primary,
                  }}
                  disabled
                >
                  Regain Access
                </TextButton>
              </Card>
              <Card
                location="TP Ground Floor"
                locker="T15"
                date="14st August 2025"
                time="11:50 - 14:10 (2hrs 20 min)"
              >
                <TextButton
                  style={{
                    backgroundColor: COLORS.text,
                  }}
                  textStyle={{
                    color: COLORS.primary,
                  }}
                >
                  Regain Access
                </TextButton>
              </Card>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
