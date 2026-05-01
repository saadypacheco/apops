export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      afiliados: {
        Row: {
          auth_user_id: string
          created_at: string
          dni: string
          estado: string
          id: string
          last_login_at: string | null
          legajo: string | null
          nombre: string
          padron_id: string | null
          tipo: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          dni: string
          estado?: string
          id?: string
          last_login_at?: string | null
          legajo?: string | null
          nombre: string
          padron_id?: string | null
          tipo: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          dni?: string
          estado?: string
          id?: string
          last_login_at?: string | null
          legajo?: string | null
          nombre?: string
          padron_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "afiliados_padron_id_fkey"
            columns: ["padron_id"]
            isOneToOne: false
            referencedRelation: "padron_cotizantes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          afiliado_id: string | null
          created_at: string
          dni_intentado: string | null
          evento: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          afiliado_id?: string | null
          created_at?: string
          dni_intentado?: string | null
          evento: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          afiliado_id?: string | null
          created_at?: string
          dni_intentado?: string | null
          evento?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
        ]
      }
      padron_cotizantes: {
        Row: {
          afiliado_apops: boolean
          afiliado_ate: boolean
          afiliado_nuevo: boolean
          afiliado_sec: boolean
          afiliado_secasfpi: boolean
          afiliado_upcn: boolean
          categoria: number | null
          cotiza_papel: boolean
          cuil: string | null
          descripcion_lugar_relevamiento: string | null
          dni: string
          fecha_actualizacion_delegados: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          id: string
          ingestado_at: string
          legajo: string | null
          lugar_trabajo_padron: string | null
          lugar_trabajo_relevamiento: string | null
          lugar_trabajo_rrhh: string | null
          nombre: string
          periodo_mandato: string | null
          provincia: string | null
          regional: string | null
          representante: string | null
          sexo: string | null
          source_batch: string
          tipo_planta: string | null
          unidad_organica_historica: string | null
          vence_mandato_30dias: boolean | null
        }
        Insert: {
          afiliado_apops?: boolean
          afiliado_ate?: boolean
          afiliado_nuevo?: boolean
          afiliado_sec?: boolean
          afiliado_secasfpi?: boolean
          afiliado_upcn?: boolean
          categoria?: number | null
          cotiza_papel?: boolean
          cuil?: string | null
          descripcion_lugar_relevamiento?: string | null
          dni: string
          fecha_actualizacion_delegados?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ingestado_at?: string
          legajo?: string | null
          lugar_trabajo_padron?: string | null
          lugar_trabajo_relevamiento?: string | null
          lugar_trabajo_rrhh?: string | null
          nombre: string
          periodo_mandato?: string | null
          provincia?: string | null
          regional?: string | null
          representante?: string | null
          sexo?: string | null
          source_batch: string
          tipo_planta?: string | null
          unidad_organica_historica?: string | null
          vence_mandato_30dias?: boolean | null
        }
        Update: {
          afiliado_apops?: boolean
          afiliado_ate?: boolean
          afiliado_nuevo?: boolean
          afiliado_sec?: boolean
          afiliado_secasfpi?: boolean
          afiliado_upcn?: boolean
          categoria?: number | null
          cotiza_papel?: boolean
          cuil?: string | null
          descripcion_lugar_relevamiento?: string | null
          dni?: string
          fecha_actualizacion_delegados?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          ingestado_at?: string
          legajo?: string | null
          lugar_trabajo_padron?: string | null
          lugar_trabajo_relevamiento?: string | null
          lugar_trabajo_rrhh?: string | null
          nombre?: string
          periodo_mandato?: string | null
          provincia?: string | null
          regional?: string | null
          representante?: string | null
          sexo?: string | null
          source_batch?: string
          tipo_planta?: string | null
          unidad_organica_historica?: string | null
          vence_mandato_30dias?: boolean | null
        }
        Relationships: []
      }
      roles_admin: {
        Row: {
          auth_user_id: string
          granted_at: string
          granted_by: string | null
          notas: string | null
        }
        Insert: {
          auth_user_id: string
          granted_at?: string
          granted_by?: string | null
          notas?: string | null
        }
        Update: {
          auth_user_id?: string
          granted_at?: string
          granted_by?: string | null
          notas?: string | null
        }
        Relationships: []
      }
      solicitudes_pendientes: {
        Row: {
          created_at: string
          dni: string
          email: string
          estado: string
          id: string
          legajo: string | null
          motivo_pendiente: string
          motivo_rechazo: string | null
          nombre_completo: string | null
          resolved_at: string | null
          resolved_by: string | null
          sub_flujo: string
        }
        Insert: {
          created_at?: string
          dni: string
          email: string
          estado?: string
          id?: string
          legajo?: string | null
          motivo_pendiente: string
          motivo_rechazo?: string | null
          nombre_completo?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sub_flujo: string
        }
        Update: {
          created_at?: string
          dni?: string
          email?: string
          estado?: string
          id?: string
          legajo?: string | null
          motivo_pendiente?: string
          motivo_rechazo?: string | null
          nombre_completo?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sub_flujo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_pendientes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "afiliados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
  storage: {
    Enums: {},
  },
} as const

