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
      about_gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      auth_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          kind: string
          ok: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          kind?: string
          ok?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          kind?: string
          ok?: boolean
        }
        Relationships: []
      }
      booking_events: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "vehicle_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          blurb: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          ordering_mode: Database["public"]["Enums"]["ordering_mode"] | null
          slug: string
          sort_order: number
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"] | null
          slug: string
          sort_order?: number
        }
        Update: {
          blurb?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"] | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      counter_sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          order_id: string
          received_on: string
          recorded_by: string
          recorded_by_name: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          note?: string | null
          order_id: string
          received_on?: string
          recorded_by: string
          recorded_by_name: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          received_on?: string
          recorded_by?: string
          recorded_by_name?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counter_sale_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_sales: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          created_by_name: string
          invoice_kind: string
          note: string | null
          order_id: string
          price_override_reason: string | null
          profile_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          created_by_name: string
          invoice_kind: string
          note?: string | null
          order_id: string
          price_override_reason?: string | null
          profile_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          invoice_kind?: string
          note?: string | null
          order_id?: string
          price_override_reason?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counter_sales_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      daily_summaries: {
        Row: {
          body: string | null
          day: string
          low_stock: number
          orders: number
          revenue: number
          sent_at: string
        }
        Insert: {
          body?: string | null
          day: string
          low_stock?: number
          orders?: number
          revenue?: number
          sent_at?: string
        }
        Update: {
          body?: string | null
          day?: string
          low_stock?: number
          orders?: number
          revenue?: number
          sent_at?: string
        }
        Relationships: []
      }
      error_log: {
        Row: {
          created_at: string
          id: string
          message: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      exchange_valuations: {
        Row: {
          condition: string | null
          created_at: string
          current_brand: string | null
          current_model: string | null
          handled_by: string | null
          id: string
          km_run: number | null
          name: string
          note: string | null
          phone: string
          photo_url: string | null
          product_id: string | null
          quoted_value: number | null
          status: string
          year: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          current_brand?: string | null
          current_model?: string | null
          handled_by?: string | null
          id?: string
          km_run?: number | null
          name: string
          note?: string | null
          phone: string
          photo_url?: string | null
          product_id?: string | null
          quoted_value?: number | null
          status?: string
          year?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          current_brand?: string | null
          current_model?: string | null
          handled_by?: string | null
          id?: string
          km_run?: number | null
          name?: string
          note?: string | null
          phone?: string
          photo_url?: string | null
          product_id?: string | null
          quoted_value?: number | null
          status?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_valuations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_enquiries: {
        Row: {
          created_at: string
          down_payment: number | null
          employment: string | null
          handled_by: string | null
          id: string
          monthly_income: number | null
          name: string
          note: string | null
          phone: string
          product_id: string | null
          status: string
          tenure_months: number | null
        }
        Insert: {
          created_at?: string
          down_payment?: number | null
          employment?: string | null
          handled_by?: string | null
          id?: string
          monthly_income?: number | null
          name: string
          note?: string | null
          phone: string
          product_id?: string | null
          status?: string
          tenure_months?: number | null
        }
        Update: {
          created_at?: string
          down_payment?: number | null
          employment?: string | null
          handled_by?: string | null
          id?: string
          monthly_income?: number | null
          name?: string
          note?: string | null
          phone?: string
          product_id?: string | null
          status?: string
          tenure_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_enquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      health_alerts: {
        Row: {
          created_at: string
          detail: string
          id: string
          kind: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          kind: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          kind?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          button_href: string | null
          button_label: string | null
          created_at: string
          heading: string
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subline: string | null
          updated_at: string
        }
        Insert: {
          button_href?: string | null
          button_label?: string | null
          created_at?: string
          heading: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subline?: string | null
          updated_at?: string
        }
        Update: {
          button_href?: string | null
          button_label?: string | null
          created_at?: string
          heading?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          kind: string
          order_id: string | null
          provider_message_id: string | null
          recipient: string
          status: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          order_id?: string | null
          provider_message_id?: string | null
          recipient: string
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          details: string | null
          id: string
          kind: string
          order_id: string
          reason: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: string | null
          id?: string
          kind: string
          order_id: string
          reason: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: string | null
          id?: string
          kind?: string
          order_id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json
          cancel_reason: string | null
          contact_phone: string | null
          courier_name: string | null
          credit_due_date: string | null
          discount: number
          gst_included: boolean
          gst_rate: number
          gstin: string | null
          human_id: string
          id: string
          lr_number: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          price_tier: Database["public"]["Enums"]["price_tier"]
          profile_id: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          public_token: string
          refunded_total: number
          return_reason: string | null
          shipped_at: string | null
          shipping_fee: number
          shipping_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          stock_released: boolean
          subtotal: number
          tax_amount: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          transport_name: string | null
          updated_at: string
        }
        Insert: {
          address?: Json
          cancel_reason?: string | null
          contact_phone?: string | null
          courier_name?: string | null
          credit_due_date?: string | null
          discount?: number
          gst_included?: boolean
          gst_rate?: number
          gstin?: string | null
          human_id: string
          id?: string
          lr_number?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          price_tier?: Database["public"]["Enums"]["price_tier"]
          profile_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          public_token?: string
          refunded_total?: number
          return_reason?: string | null
          shipped_at?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          transport_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json
          cancel_reason?: string | null
          contact_phone?: string | null
          courier_name?: string | null
          credit_due_date?: string | null
          discount?: number
          gst_included?: boolean
          gst_rate?: number
          gstin?: string | null
          human_id?: string
          id?: string
          lr_number?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          price_tier?: Database["public"]["Enums"]["price_tier"]
          profile_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          public_token?: string
          refunded_total?: number
          return_reason?: string | null
          shipped_at?: string | null
          shipping_fee?: number
          shipping_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          subtotal?: number
          tax_amount?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          transport_name?: string | null
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
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string | null
          id: string
          order_id: string | null
          payload: Json
          provider: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string | null
          id?: string
          order_id?: string | null
          payload?: Json
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tiers: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["price_tier"]
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty?: number
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["price_tier"]
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          price?: number
          product_id?: string
          tier?: Database["public"]["Enums"]["price_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compatibility: {
        Row: {
          id: string
          product_id: string
          variant: string | null
          vehicle_model: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          id?: string
          product_id: string
          variant?: string | null
          vehicle_model: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          id?: string
          product_id?: string
          variant?: string | null
          vehicle_model?: string
          year_from?: number | null
          year_to?: number | null
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
      product_enquiries: {
        Row: {
          alternative_product_id: string | null
          created_at: string
          expected_date: string | null
          handled_by: string | null
          id: string
          name: string
          note: string | null
          phone: string
          photo_url: string | null
          product_id: string | null
          product_name: string | null
          qty: number
          quote_expires_at: string | null
          quote_token: string | null
          quoted_price: number | null
          replied_at: string | null
          reply: string | null
          source: string
          status: string
          vehicle: string | null
        }
        Insert: {
          alternative_product_id?: string | null
          created_at?: string
          expected_date?: string | null
          handled_by?: string | null
          id?: string
          name: string
          note?: string | null
          phone: string
          photo_url?: string | null
          product_id?: string | null
          product_name?: string | null
          qty?: number
          quote_expires_at?: string | null
          quote_token?: string | null
          quoted_price?: number | null
          replied_at?: string | null
          reply?: string | null
          source?: string
          status?: string
          vehicle?: string | null
        }
        Update: {
          alternative_product_id?: string | null
          created_at?: string
          expected_date?: string | null
          handled_by?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string
          photo_url?: string | null
          product_id?: string | null
          product_name?: string | null
          qty?: number
          quote_expires_at?: string | null
          quote_token?: string | null
          quoted_price?: number | null
          replied_at?: string | null
          reply?: string | null
          source?: string
          status?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_enquiries_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_enquiries_product_id_fkey"
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
          box_contents: string | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          min_order_qty: number
          model: string | null
          mrp: number | null
          name: string
          order_multiple: number
          ordering_mode: Database["public"]["Enums"]["ordering_mode"] | null
          price: number | null
          product_kind: Database["public"]["Enums"]["product_kind"]
          rack_location: string | null
          reorder_threshold: number | null
          shipping_info: string | null
          sku: string
          slug: string
          specs: Json
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          subcategory: string | null
          trade_only: boolean
          updated_at: string
          voltage: string | null
          warranty: string | null
          wattage: string | null
          weight: string | null
        }
        Insert: {
          ah?: string | null
          box_contents?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          min_order_qty?: number
          model?: string | null
          mrp?: number | null
          name: string
          order_multiple?: number
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"] | null
          price?: number | null
          product_kind?: Database["public"]["Enums"]["product_kind"]
          rack_location?: string | null
          reorder_threshold?: number | null
          shipping_info?: string | null
          sku: string
          slug: string
          specs?: Json
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          subcategory?: string | null
          trade_only?: boolean
          updated_at?: string
          voltage?: string | null
          warranty?: string | null
          wattage?: string | null
          weight?: string | null
        }
        Update: {
          ah?: string | null
          box_contents?: string | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          min_order_qty?: number
          model?: string | null
          mrp?: number | null
          name?: string
          order_multiple?: number
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"] | null
          price?: number | null
          product_kind?: Database["public"]["Enums"]["product_kind"]
          rack_location?: string | null
          reorder_threshold?: number | null
          shipping_info?: string | null
          sku?: string
          slug?: string
          specs?: Json
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          subcategory?: string | null
          trade_only?: boolean
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
          credit_limit: number
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          full_name: string | null
          id: string
          payment_terms_days: number
          phone: string | null
          price_tier: Database["public"]["Enums"]["price_tier"]
          trade_approved_at: string | null
        }
        Insert: {
          created_at?: string
          credit_limit?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          full_name?: string | null
          id: string
          payment_terms_days?: number
          phone?: string | null
          price_tier?: Database["public"]["Enums"]["price_tier"]
          trade_approved_at?: string | null
        }
        Update: {
          created_at?: string
          credit_limit?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          full_name?: string | null
          id?: string
          payment_terms_days?: number
          phone?: string | null
          price_tier?: Database["public"]["Enums"]["price_tier"]
          trade_approved_at?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: string
          note: string | null
          order_id: string
          provider_payment_id: string | null
          provider_refund_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id: string
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          provider_payment_id?: string | null
          provider_refund_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          photos: string[]
          product_id: string
          profile_id: string | null
          rating: number
          staff_replied_at: string | null
          staff_reply: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          photos?: string[]
          product_id: string
          profile_id?: string | null
          rating: number
          staff_replied_at?: string | null
          staff_reply?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          photos?: string[]
          product_id?: string
          profile_id?: string | null
          rating?: number
          staff_replied_at?: string | null
          staff_reply?: string | null
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
      search_misses: {
        Row: {
          hits: number
          last_at: string
          term: string
        }
        Insert: {
          hits?: number
          last_at?: string
          term: string
        }
        Update: {
          hits?: number
          last_at?: string
          term?: string
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          created_at: string
          handled_by: string | null
          id: string
          issue: string | null
          name: string
          note: string | null
          phone: string
          preferred_date: string | null
          product_id: string | null
          registration_id: string | null
          slot: string | null
          status: string
        }
        Insert: {
          created_at?: string
          handled_by?: string | null
          id?: string
          issue?: string | null
          name: string
          note?: string | null
          phone: string
          preferred_date?: string | null
          product_id?: string | null
          registration_id?: string | null
          slot?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          handled_by?: string | null
          id?: string
          issue?: string | null
          name?: string
          note?: string | null
          phone?: string
          preferred_date?: string | null
          product_id?: string | null
          registration_id?: string | null
          slot?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_records: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          next_due_on: string | null
          odometer: number | null
          performed_on: string
          registration_id: string
          work_done: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_due_on?: string | null
          odometer?: number | null
          performed_on?: string
          registration_id: string
          work_done: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_due_on?: string | null
          odometer?: number | null
          performed_on?: string
          registration_id?: string
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_schedule: {
        Row: {
          completed_at: string | null
          created_at: string
          due_km: number | null
          due_on: string
          id: string
          label: string
          note: string | null
          registration_id: string
          reminded_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_km?: number | null
          due_on: string
          id?: string
          label: string
          note?: string | null
          registration_id: string
          reminded_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_km?: number | null
          due_on?: string
          id?: string
          label?: string
          note?: string | null
          registration_id?: string
          reminded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_schedule_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "vehicle_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          billing_address: string | null
          browse_banner: string | null
          cod_enabled: boolean
          cod_limit: number
          cod_pincodes: string[]
          default_hsn: string
          grievance_officer_email: string | null
          grievance_officer_name: string | null
          grievance_officer_phone: string | null
          gst_enabled: boolean
          gst_rate: number
          gstin: string | null
          id: boolean
          legal_name: string | null
          low_stock_threshold: number
          notify_enabled: boolean
          ordering_mode: Database["public"]["Enums"]["ordering_mode"]
          owner_email: string | null
          owner_whatsapp: string
          policy_updated_at: string | null
          prices_include_gst: boolean
          support_email: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          browse_banner?: string | null
          cod_enabled?: boolean
          cod_limit?: number
          cod_pincodes?: string[]
          default_hsn?: string
          grievance_officer_email?: string | null
          grievance_officer_name?: string | null
          grievance_officer_phone?: string | null
          gst_enabled?: boolean
          gst_rate?: number
          gstin?: string | null
          id?: boolean
          legal_name?: string | null
          low_stock_threshold?: number
          notify_enabled?: boolean
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"]
          owner_email?: string | null
          owner_whatsapp?: string
          policy_updated_at?: string | null
          prices_include_gst?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          browse_banner?: string | null
          cod_enabled?: boolean
          cod_limit?: number
          cod_pincodes?: string[]
          default_hsn?: string
          grievance_officer_email?: string | null
          grievance_officer_name?: string | null
          grievance_officer_phone?: string | null
          gst_enabled?: boolean
          gst_rate?: number
          gstin?: string | null
          id?: boolean
          legal_name?: string | null
          low_stock_threshold?: number
          notify_enabled?: boolean
          ordering_mode?: Database["public"]["Enums"]["ordering_mode"]
          owner_email?: string | null
          owner_whatsapp?: string
          policy_updated_at?: string | null
          prices_include_gst?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
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
      stock_alerts: {
        Row: {
          channel: string
          contact: string
          created_at: string
          id: string
          notified_at: string | null
          product_id: string
          profile_id: string | null
        }
        Insert: {
          channel?: string
          contact: string
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id: string
          profile_id?: string | null
        }
        Update: {
          channel?: string
          contact?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_ride_requests: {
        Row: {
          created_at: string
          handled_by: string | null
          id: string
          name: string
          note: string | null
          phone: string
          preferred_date: string | null
          product_id: string | null
          slot: string | null
          status: string
        }
        Insert: {
          created_at?: string
          handled_by?: string | null
          id?: string
          name: string
          note?: string | null
          phone: string
          preferred_date?: string | null
          product_id?: string | null
          slot?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          handled_by?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string
          preferred_date?: string | null
          product_id?: string | null
          slot?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_ride_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_applications: {
        Row: {
          address_proof_path: string | null
          brands: string[]
          business_name: string
          business_type: string | null
          contact_person: string
          created_at: string
          decided_at: string | null
          decision_note: string | null
          gst_certificate_path: string | null
          gstin: string | null
          id: string
          monthly_volume: string | null
          pan: string | null
          pan_card_path: string | null
          part_categories: string[]
          phone: string
          profile_id: string
          requested_tier: Database["public"]["Enums"]["price_tier"]
          reviewer: string | null
          shop_address: string
          shop_photo_path: string | null
          staff_count: string | null
          status: Database["public"]["Enums"]["trade_application_status"]
          trade_licence_path: string | null
          updated_at: string
          years_in_business: string | null
        }
        Insert: {
          address_proof_path?: string | null
          brands?: string[]
          business_name: string
          business_type?: string | null
          contact_person: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          gst_certificate_path?: string | null
          gstin?: string | null
          id?: string
          monthly_volume?: string | null
          pan?: string | null
          pan_card_path?: string | null
          part_categories?: string[]
          phone: string
          profile_id: string
          requested_tier?: Database["public"]["Enums"]["price_tier"]
          reviewer?: string | null
          shop_address: string
          shop_photo_path?: string | null
          staff_count?: string | null
          status?: Database["public"]["Enums"]["trade_application_status"]
          trade_licence_path?: string | null
          updated_at?: string
          years_in_business?: string | null
        }
        Update: {
          address_proof_path?: string | null
          brands?: string[]
          business_name?: string
          business_type?: string | null
          contact_person?: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          gst_certificate_path?: string | null
          gstin?: string | null
          id?: string
          monthly_volume?: string | null
          pan?: string | null
          pan_card_path?: string | null
          part_categories?: string[]
          phone?: string
          profile_id?: string
          requested_tier?: Database["public"]["Enums"]["price_tier"]
          reviewer?: string | null
          shop_address?: string
          shop_photo_path?: string | null
          staff_count?: string | null
          status?: Database["public"]["Enums"]["trade_application_status"]
          trade_licence_path?: string | null
          updated_at?: string
          years_in_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_doc_checks: {
        Row: {
          checked_at: string
          extracted: Json
          field: string
          id: string
          issues: string[]
          path: string
          profile_id: string
          status: string
        }
        Insert: {
          checked_at?: string
          extracted?: Json
          field: string
          id?: string
          issues?: string[]
          path: string
          profile_id: string
          status: string
        }
        Update: {
          checked_at?: string
          extracted?: Json
          field?: string
          id?: string
          issues?: string[]
          path?: string
          profile_id?: string
          status?: string
        }
        Relationships: []
      }
      trade_internal_notes: {
        Row: {
          application_id: string
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_internal_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "trade_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          order_id: string | null
          profile_id: string
          settled: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          order_id?: string | null
          profile_id: string
          settled?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          order_id?: string | null
          profile_id?: string
          settled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trade_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists: {
        Row: {
          cart: Json
          profile_id: string
          recently_viewed: Json
          reminded_at: string | null
          saved: Json
          updated_at: string
          wishlist: Json
        }
        Insert: {
          cart?: Json
          profile_id: string
          recently_viewed?: Json
          reminded_at?: string | null
          saved?: Json
          updated_at?: string
          wishlist?: Json
        }
        Update: {
          cart?: Json
          profile_id?: string
          recently_viewed?: Json
          reminded_at?: string | null
          saved?: Json
          updated_at?: string
          wishlist?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_bookings: {
        Row: {
          address: string | null
          balance_due: number
          colour: string | null
          created_at: string
          customer_name: string
          email: string | null
          expected_delivery: string | null
          human_id: string
          id: string
          note: string | null
          on_road_total: number
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          price_breakdown: Json
          product_id: string
          profile_id: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          public_token: string
          status: Database["public"]["Enums"]["booking_status"]
          token_amount: number
          updated_at: string
          variant: string | null
        }
        Insert: {
          address?: string | null
          balance_due?: number
          colour?: string | null
          created_at?: string
          customer_name: string
          email?: string | null
          expected_delivery?: string | null
          human_id: string
          id?: string
          note?: string | null
          on_road_total?: number
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          price_breakdown?: Json
          product_id: string
          profile_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_amount?: number
          updated_at?: string
          variant?: string | null
        }
        Update: {
          address?: string | null
          balance_due?: number
          colour?: string | null
          created_at?: string
          customer_name?: string
          email?: string | null
          expected_delivery?: string | null
          human_id?: string
          id?: string
          note?: string | null
          on_road_total?: number
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          price_breakdown?: Json
          product_id?: string
          profile_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          public_token?: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_amount?: number
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_pricing: {
        Row: {
          accessories: number
          ex_showroom: number
          insurance: number
          on_road: number | null
          product_id: string
          rto: number
          subsidy: number
          token_amount: number
          updated_at: string
        }
        Insert: {
          accessories?: number
          ex_showroom?: number
          insurance?: number
          on_road?: number | null
          product_id: string
          rto?: number
          subsidy?: number
          token_amount?: number
          updated_at?: string
        }
        Update: {
          accessories?: number
          ex_showroom?: number
          insurance?: number
          on_road?: number | null
          product_id?: string
          rto?: number
          subsidy?: number
          token_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_registrations: {
        Row: {
          booking_id: string | null
          chassis_number: string | null
          created_at: string
          delivered_on: string | null
          id: string
          motor_number: string | null
          note: string | null
          owner_name: string
          phone: string
          product_id: string | null
          profile_id: string | null
          registration_number: string | null
          updated_at: string
          warranty_start: string | null
        }
        Insert: {
          booking_id?: string | null
          chassis_number?: string | null
          created_at?: string
          delivered_on?: string | null
          id?: string
          motor_number?: string | null
          note?: string | null
          owner_name: string
          phone: string
          product_id?: string | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string
          warranty_start?: string | null
        }
        Update: {
          booking_id?: string | null
          chassis_number?: string | null
          created_at?: string
          delivered_on?: string | null
          id?: string
          motor_number?: string | null
          note?: string | null
          owner_name?: string
          phone?: string
          product_id?: string | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_registrations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "vehicle_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_registrations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_specs: {
        Row: {
          battery_capacity: string | null
          battery_type: string | null
          certified_range: string | null
          charging_time: string | null
          colours: string[]
          kerb_weight: string | null
          motor_power: string | null
          product_id: string
          registration_required: boolean
          service_interval_km: number
          service_interval_months: number
          top_speed: string | null
          updated_at: string
          variant: string | null
          warranty_km: number | null
          warranty_years: number | null
        }
        Insert: {
          battery_capacity?: string | null
          battery_type?: string | null
          certified_range?: string | null
          charging_time?: string | null
          colours?: string[]
          kerb_weight?: string | null
          motor_power?: string | null
          product_id: string
          registration_required?: boolean
          service_interval_km?: number
          service_interval_months?: number
          top_speed?: string | null
          updated_at?: string
          variant?: string | null
          warranty_km?: number | null
          warranty_years?: number | null
        }
        Update: {
          battery_capacity?: string | null
          battery_type?: string | null
          certified_range?: string | null
          charging_time?: string | null
          colours?: string[]
          kerb_weight?: string | null
          motor_power?: string | null
          product_id?: string
          registration_required?: boolean
          service_interval_km?: number
          service_interval_months?: number
          top_speed?: string | null
          updated_at?: string
          variant?: string | null
          warranty_km?: number | null
          warranty_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_statuses: {
        Row: {
          created_at: string
          error: string | null
          id: string
          message_id: string
          status: string
          status_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          message_id: string
          status: string
          status_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string
          status?: string
          status_at?: string
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          delivery_id: string
          event: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          delivery_id: string
          event: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          delivery_id?: string
          event?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      best_sellers: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          product_id: string
          sold: number
        }[]
      }
      booking_by_token: {
        Args: { p_token: string }
        Returns: {
          balance_due: number
          colour: string
          created_at: string
          events: Json
          expected_delivery: string
          human_id: string
          model_name: string
          model_slug: string
          on_road_total: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          price_breakdown: Json
          status: Database["public"]["Enums"]["booking_status"]
          token_amount: number
          variant: string
        }[]
      }
      build_service_schedule: {
        Args: { p_registration: string }
        Returns: number
      }
      cancel_counter_sale: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_order_id: string
          p_reason: string
        }
        Returns: boolean
      }
      create_counter_sale: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_invoice_kind: string
          p_items: Json
          p_note: string
          p_override_reason: string
          p_profile_id: string
        }
        Returns: {
          human_id: string
          order_id: string
          public_token: string
          total: number
        }[]
      }
      create_order: {
        Args: {
          p_address: Json
          p_coupon_code?: string
          p_items: Json
          p_lr_number?: string
          p_payment_method: string
          p_profile_id?: string
          p_quote_token?: string
          p_shipping_code: string
          p_transport_name?: string
        }
        Returns: {
          human_id: string
          order_id: string
          payment_status: string
          public_token: string
          total: number
        }[]
      }
      customer_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["price_tier"]
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_trade: { Args: { _user_id: string }; Returns: boolean }
      log_search_miss: { Args: { p_term: string }; Returns: undefined }
      mark_order_paid: {
        Args: { p_order_id: string; p_payment_id: string }
        Returns: boolean
      }
      place_order: {
        Args: {
          p_address: Json
          p_coupon_code?: string
          p_items: Json
          p_payment_method: string
          p_shipping_fee?: number
          p_shipping_method: string
        }
        Returns: {
          human_id: string
          order_id: string
          public_token: string
        }[]
      }
      preview_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          discount: number
          message: string
          valid: boolean
        }[]
      }
      quote_by_token: {
        Args: { p_token: string }
        Returns: {
          enquiry_id: string
          expires_at: string
          image_url: string
          product_id: string
          product_name: string
          product_slug: string
          qty: number
          spent: boolean
          unit_price: number
        }[]
      }
      record_counter_sale_payment: {
        Args: {
          p_actor_id: string
          p_actor_name: string
          p_amount: number
          p_method: string
          p_note: string
          p_order_id: string
          p_received_on: string
          p_reference: string
        }
        Returns: number
      }
      release_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      search_product_ids: {
        Args: { p_limit?: number; p_term: string }
        Returns: {
          id: string
          score: number
        }[]
      }
      set_order_gst: {
        Args: { p_enabled: boolean; p_order_id: string; p_rate: number }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_bootstrap_needed: { Args: never; Returns: boolean }
      staff_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      tier_price: {
        Args: {
          p_product: string
          p_qty: number
          p_tier: Database["public"]["Enums"]["price_tier"]
        }
        Returns: number
      }
      trade_balance: { Args: { _profile_id: string }; Returns: number }
      trade_overdue: { Args: { _profile_id: string }; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "booked"
        | "allotted"
        | "rto_in_progress"
        | "ready_for_delivery"
        | "delivered"
        | "cancelled"
      coupon_type: "percent" | "fixed"
      customer_type: "retail" | "trade"
      ledger_kind: "invoice" | "payment" | "adjustment"
      order_status:
        | "order_confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "returned"
      ordering_mode: "full" | "enquiry" | "browse"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cod_pending"
      price_tier: "retail" | "trade" | "distributor"
      product_kind: "part" | "vehicle"
      product_status: "draft" | "visible" | "hidden"
      review_status: "pending" | "approved" | "rejected"
      staff_role: "super_admin" | "owner" | "manager" | "staff"
      trade_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "more_info_needed"
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
      booking_status: [
        "booked",
        "allotted",
        "rto_in_progress",
        "ready_for_delivery",
        "delivered",
        "cancelled",
      ],
      coupon_type: ["percent", "fixed"],
      customer_type: ["retail", "trade"],
      ledger_kind: ["invoice", "payment", "adjustment"],
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
      ordering_mode: ["full", "enquiry", "browse"],
      payment_status: ["pending", "paid", "failed", "refunded", "cod_pending"],
      price_tier: ["retail", "trade", "distributor"],
      product_kind: ["part", "vehicle"],
      product_status: ["draft", "visible", "hidden"],
      review_status: ["pending", "approved", "rejected"],
      staff_role: ["super_admin", "owner", "manager", "staff"],
      trade_application_status: [
        "pending",
        "approved",
        "rejected",
        "more_info_needed",
      ],
    },
  },
} as const
