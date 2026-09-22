import { createContext, useContext } from "react";
import { getAdminAuth } from "../auth/adminAuth.js";

// The context object on its own, so a component can read company data without
// importing the provider (and, through it, the socket client).
export const CompanyDataContext = createContext(null);

/** The company's display name, where one is known — safe outside the provider. */
export function useCompanyName() {
  return useContext(CompanyDataContext)?.me?.company?.name || getAdminAuth()?.user?.company?.name || "";
}
