/**
 * Database types for the Khang Supabase project.
 *
 * Written in the exact shape produced by the Supabase CLI, so you can
 * regenerate it at any time after changing a migration:
 *
 *     npm run db:types
 *     # → supabase gen types typescript --local > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          line1: string;
          line2: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          line1: string;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          line1?: string;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          code: string | null;
          name: string;
          chinese_name: string | null;
          slug: string;
          category_id: string;
          price: number;
          description: string;
          ingredients: string[];
          image: string;
          images: string[];
          rating: number;
          reviews_count: number;
          spicy: number;
          veg: boolean;
          featured: boolean;
          prep_time: string;
          in_stock: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          name: string;
          chinese_name?: string | null;
          slug: string;
          category_id: string;
          price: number;
          description?: string;
          ingredients?: string[];
          image: string;
          images?: string[];
          rating?: number;
          reviews_count?: number;
          spicy?: number;
          veg?: boolean;
          featured?: boolean;
          prep_time?: string;
          in_stock?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string | null;
          name?: string;
          chinese_name?: string | null;
          slug?: string;
          category_id?: string;
          price?: number;
          description?: string;
          ingredients?: string[];
          image?: string;
          images?: string[];
          rating?: number;
          reviews_count?: number;
          spicy?: number;
          veg?: boolean;
          featured?: boolean;
          prep_time?: string;
          in_stock?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          address: Json;
          subtotal: number;
          tax: number;
          delivery: number;
          discount: number;
          total: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_gateway: Database["public"]["Enums"]["payment_gateway"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          stripe_payment_intent_id: string | null;
          stripe_client_secret: string | null;
          paid_at: string | null;
          status: Database["public"]["Enums"]["order_status"];
          estimated_delivery: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          address?: Json;
          subtotal: number;
          tax?: number;
          delivery?: number;
          discount?: number;
          total: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_gateway?: Database["public"]["Enums"]["payment_gateway"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_client_secret?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          payment_gateway?: Database["public"]["Enums"]["payment_gateway"];
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_client_secret?: string | null;
          paid_at?: string | null;
          estimated_delivery?: string | null;
          delivered_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          name: string;
          chinese_name: string | null;
          image: string | null;
          price: number;
          qty: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          name: string;
          chinese_name?: string | null;
          image?: string | null;
          price: number;
          qty: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          chinese_name?: string | null;
          image?: string | null;
          price?: number;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_tracking: {
        Row: {
          id: string;
          order_id: string;
          stage: Database["public"]["Enums"]["order_status"];
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          stage: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          created_at?: string;
        };
        Update: {
          stage?: Database["public"]["Enums"]["order_status"];
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          rating: number;
          text: string;
          user_name: string | null;
          location: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          rating: number;
          text: string;
          user_name?: string | null;
          location?: string | null;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          text?: string;
          location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      favourites: {
        Row: { user_id: string; product_id: string; created_at: string };
        Insert: { user_id: string; product_id: string; created_at?: string };
        Update: { user_id?: string; product_id?: string };
        Relationships: [
          {
            foreignKeyName: "favourites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favourites_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_order_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      create_order: {
        Args: {
          p_items: Json;
          p_address: Json;
          p_customer?: Json;
          p_payment_method?: string;
        };
        Returns: Json;
      };
      is_admin: {
        Args: { uid?: string };
        Returns: boolean;
      };
      set_order_status: {
        Args: { p_order_id: string; p_status: string; p_note?: string };
        Returns: Json;
      };
      submit_review: {
        Args: {
          p_product: string;
          p_rating: number;
          p_text: string;
          p_location?: string;
        };
        Returns: Json;
      };
      toggle_favourite: {
        Args: { p_product: string };
        Returns: boolean;
      };
      track_order: {
        Args: { p_order_number: string };
        Returns: Json;
      };
    };
    Enums: {
      order_status:
        | "received"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled";
      payment_gateway: "razorpay" | "stripe" | "cod" | "none";
      payment_method: "upi" | "card" | "wallet" | "cod" | "stripe" | "razorpay";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      user_role: "user" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
}

// ─── Convenience aliases used across the app ──────────────────
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type OrderStatus = Enums<"order_status">;
export type PaymentStatus = Enums<"payment_status">;
export type PaymentMethod = Enums<"payment_method">;
export type PaymentGateway = Enums<"payment_gateway">;
export type UserRole = Enums<"user_role">;
