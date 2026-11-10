export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          creado_por: string | null
          id: number
          nombre: string
        }
        Insert: {
          creado_por?: string | null
          id?: never
          nombre: string
        }
        Update: {
          creado_por?: string | null
          id?: never
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean
          creado_en: string
          email: string
          es_admin: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          email: string
          es_admin?: boolean
          id: string
          nombre: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          email?: string
          es_admin?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      inventario_movimientos: {
        Row: {
          cantidad: number
          empleado_id: string
          fecha: string
          id: number
          nota: string | null
          producto_id: number
          tipo: Database["public"]["Enums"]["tipo_mov_inventario"]
        }
        Insert: {
          cantidad: number
          empleado_id?: string
          fecha?: string
          id?: never
          nota?: string | null
          producto_id: number
          tipo: Database["public"]["Enums"]["tipo_mov_inventario"]
        }
        Update: {
          cantidad?: number
          empleado_id?: string
          fecha?: string
          id?: never
          nota?: string | null
          producto_id?: number
          tipo?: Database["public"]["Enums"]["tipo_mov_inventario"]
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "saldo_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "socios_por_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "stock_producto"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          creada_en: string
          datos: Json | null
          destinatario_id: string
          enviada_correo: boolean
          id: number
          leida: boolean
          mensaje: string
          tipo: string
          titulo: string
        }
        Insert: {
          creada_en?: string
          datos?: Json | null
          destinatario_id: string
          enviada_correo?: boolean
          id?: never
          leida?: boolean
          mensaje: string
          tipo: string
          titulo: string
        }
        Update: {
          creada_en?: string
          datos?: Json | null
          destinatario_id?: string
          enviada_correo?: boolean
          id?: never
          leida?: boolean
          mensaje?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria_id: number
          creado_por: string | null
          id: number
          nombre: string
          precio: number
        }
        Insert: {
          activo?: boolean
          categoria_id: number
          creado_por?: string | null
          id?: never
          nombre: string
          precio: number
        }
        Update: {
          activo?: boolean
          categoria_id?: number
          creado_por?: string | null
          id?: never
          nombre?: string
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      retiros: {
        Row: {
          empleado_id: string
          fecha: string
          id: number
          monto: number
          nota: string | null
          producto_id: number
        }
        Insert: {
          empleado_id?: string
          fecha?: string
          id?: never
          monto: number
          nota?: string | null
          producto_id: number
        }
        Update: {
          empleado_id?: string
          fecha?: string
          id?: never
          monto?: number
          nota?: string | null
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "retiros_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retiros_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "saldo_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "retiros_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "socios_por_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "retiros_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "stock_producto"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      socios: {
        Row: {
          activo: boolean
          categoria_id: number
          empleado_id: string
          id: number
          ingreso_en: string
          salio_en: string | null
        }
        Insert: {
          activo?: boolean
          categoria_id: number
          empleado_id: string
          id?: never
          ingreso_en?: string
          salio_en?: string | null
        }
        Update: {
          activo?: boolean
          categoria_id?: number
          empleado_id?: string
          id?: never
          ingreso_en?: string
          salio_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      venta_items: {
        Row: {
          cantidad: number
          id: number
          precio_unitario: number
          producto_id: number
          venta_id: number
        }
        Insert: {
          cantidad: number
          id?: never
          precio_unitario: number
          producto_id: number
          venta_id: number
        }
        Update: {
          cantidad?: number
          id?: never
          precio_unitario?: number
          producto_id?: number
          venta_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "saldo_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "socios_por_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "stock_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          empleado_id: string
          fecha: string
          id: number
          nota: string | null
          tipo: Database["public"]["Enums"]["tipo_venta"]
          venta_origen_id: number | null
        }
        Insert: {
          empleado_id?: string
          fecha?: string
          id?: never
          nota?: string | null
          tipo?: Database["public"]["Enums"]["tipo_venta"]
          venta_origen_id?: number | null
        }
        Update: {
          empleado_id?: string
          fecha?: string
          id?: never
          nota?: string | null
          tipo?: Database["public"]["Enums"]["tipo_venta"]
          venta_origen_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_venta_origen_id_fkey"
            columns: ["venta_origen_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      movimientos_producto: {
        Row: {
          cantidad_neta: number | null
          fecha: string | null
          monto_neto: number | null
          producto_id: number | null
          vendedor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "saldo_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "socios_por_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "stock_producto"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ventas_empleado_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      saldo_producto: {
        Row: {
          nombre: string | null
          producto_id: number | null
          saldo: number | null
        }
        Insert: {
          nombre?: string | null
          producto_id?: number | null
          saldo?: never
        }
        Update: {
          nombre?: string | null
          producto_id?: number | null
          saldo?: never
        }
        Relationships: []
      }
      socios_por_producto: {
        Row: {
          empleado_id: string | null
          producto_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_producto: {
        Row: {
          nombre: string | null
          producto_id: number | null
          stock: number | null
        }
        Insert: {
          nombre?: string | null
          producto_id?: number | null
          stock?: never
        }
        Update: {
          nombre?: string | null
          producto_id?: number | null
          stock?: never
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_empleado: {
        Args: { p_activo: boolean; p_es_admin: boolean; p_id: string }
        Returns: undefined
      }
      es_activo: { Args: never; Returns: boolean }
      es_admin: { Args: never; Returns: boolean }
      es_mi_venta: { Args: { p_venta: number }; Returns: boolean }
      es_socio_producto: {
        Args: { p_empleado: string; p_producto: number }
        Returns: boolean
      }
      registrar_venta: {
        Args: {
          p_items: Json
          p_nota?: string
          p_tipo?: Database["public"]["Enums"]["tipo_venta"]
          p_venta_origen?: number
        }
        Returns: number
      }
      reporte_socio: {
        Args: { p_desde: string; p_granularidad: string; p_hasta: string }
        Returns: {
          periodo: string
          producto: string
          retiros: number
          unidades: number
          ventas_netas: number
        }[]
      }
      venta_de_mis_productos: { Args: { p_venta: number }; Returns: boolean }
    }
    Enums: {
      tipo_mov_inventario: "entrada" | "ajuste"
      tipo_venta: "venta" | "devolucion"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      tipo_mov_inventario: ["entrada", "ajuste"],
      tipo_venta: ["venta", "devolucion"],
    },
  },
} as const

