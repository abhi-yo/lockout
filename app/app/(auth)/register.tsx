import TextButton from "@/components/text-button";
import { Text, View } from "react-native";
import Input from "@/components/ui/input";
import BackButton from "@/components/back-button";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignIn() {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      registrationNumber: "",
      name: "",
      email: "",
      password: "",
    },
    resolver: zodResolver(
      z.object({
        registrationNumber: z
          .string()
          .length(15, {
            message: "Registration number must be 15 characters long",
          })
          .includes("RA", {
            message: "Registration number must start with RA",
          }),
        name: z.string().min(3, {
          message: "Name must be at least 3 characters long",
        }),
        email: z
          .string()
          .email({ message: "Enter a valid email" })
          .includes("srmist.edu.in", {
            message: "Email must be an SRMIST email",
          }),
        password: z
          .string()
          .min(8, { message: "Password must be at least 8 characters long" }),
      })
    ),
  });

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
      }}
    >
      <View
        style={{
          display: "flex",
          justifyContent: "center",
          marginVertical: 40,
        }}
      >
        <BackButton />
        <Text
          style={{
            fontFamily: "MonaSans-Bold",
            fontSize: 24,
            marginVertical: 40,
          }}
        >
          Welcome to Lockout,{"\n"}Sign Up to Get Started
        </Text>
      </View>
      <View
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 400,
          gap: 20,
        }}
      >
        <Controller
          control={control}
          name="registrationNumber"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Enter your registration number"
              inputMode="text"
              errorMessage={errors.registrationNumber?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Enter your name"
              inputMode="text"
              errorMessage={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Enter your email"
              inputMode="email"
              keyboardType="email-address"
              errorMessage={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Set a password"
              inputMode="text"
              secureTextEntry
              errorMessage={errors.password?.message}
            />
          )}
        />
        <TextButton onPress={handleSubmit((values) => console.log(values))}>
          Sign Up
        </TextButton>
      </View>
    </View>
  );
}
