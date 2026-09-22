export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          landmark: string | null
          line1: string | null
          name: string | null
          phone: string | null
          pincode: string | null
          profile_id: string
          state: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          line1?: string | null
          name?: string | null
          phone?: string | null
          pincode?: string | null
          profile_id: string
          state?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          line1?: string | null
          name?: string | null
          phone?: string | null
          pincode?: string | null
          profile_id?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          diff: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          blurb: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          blurb?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          starts_at: string | null
          times_used: number
          type: Database["public"]["Enums"]["coupon_type"]
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          starts_at?: string | null
          times_used?: number
          type: Database["public"]["Enums"]["coupon_type"]
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          starts_at?: string | null
          times_used?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_snapshot: string | null
          name_snapshot: string
          order_id: string
          price_snapshot: number | null
          product_id: string | null
          qty: number
        }
        Insert: {
          id?: string
          image_snapshot?: string | null
          name_snapshot: string
          order_id: string
          price_snapshot?: number | null
          product_id?: string | null
          qty?: number
        }
        Update: {
          id?: string
          image_snapshot?: string | null
          name_snapshot?: string
          order_id?: string
          price_snapshot?: number | null
          product_id?: string | null
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json
          discount: number
          human_id: string
          id: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          profile_id: string | null
          shipping_fee: number
          shipping_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: Json
          discount?: number
          human_id: string
          id?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          profile_id?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: Json
          discount?: number
          human_id?: string
          id?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          profile_id?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compatibility: {
        Row: {
          id: string
          product_id: string
          vehicle_model: string
        }
        Insert: {
          id?: string
          product_id: string
          vehicle_model: string
        }
        Update: {
          id?: string
          product_id?: string
          vehicle_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_compatibility_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ah: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean
          model: string | null
          mrp: number | null
          name: string
          price: number | null
          shipping_info: string | null
          sku: string
          slug: string
          specs: Json
          stock: number
          subcategory: string | null
          updated_at: string
          voltage: string | null
          warranty: string | null
          wattage: string | null
          weight: string | null
        }
        Insert: {
          ah?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          mrp?: number | null
          name: string
          price?: number | null
          shipping_info?: string | null
          sku: string
          slug: string
          specs?: Json
          stock?: number
          subcategory?: string | null
          updated_at?: string
          voltage?: string | null
          warranty?: string | null
          wattage?: string | null
          weight?: string | null
        }
        Update: {
          ah?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          mrp?: number | null
          name?: string
          price?: number | null
          shipping_info?: string | null
          sku?: string
          slug?: string
          specs?: Json
          stock?: number
          subcategory?: string | null
          updated_at?: string
          voltage?: string | null
          warranty?: string | null
          wattage?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          product_id: string
          profile_id: string | null
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          product_id: string
          profile_id?: string | null
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          product_id?: string
          profile_id?: string | null
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      coupon_type: "percent" | "fixed"
      order_status:
        | "order_confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cod_pending"
      review_status: "pending" | "approved" | "rejected"
      staff_role: "owner" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      coupon_type: ["percent", "fixed"],
      order_status: [
        "order_confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_status: ["pending", "paid", "failed", "refunded", "cod_pending"],
      review_status: ["pending", "approved", "rejected"],
      staff_role: ["owner", "manager", "staff"],
    },
  },
} as const
