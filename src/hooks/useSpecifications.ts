import { useState, useEffect, useCallback } from "react";
import { specificationService, Specification } from "../services";
import { ManualSpecificationRequest } from "../types/manualSpec";

export function useSpecifications(projectId: string) {
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [trashedSpecifications, setTrashedSpecifications] = useState<
    Specification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // FE-18: view mode
  const [viewMode, setViewMode] = useState<"main" | "trash">("main");

  const fetchSpecifications = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await specificationService.getSpecifications(
        projectId,
        false,
      );
      setSpecifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Không thể tải danh sách đặc tả.";
      setError(message);
      setSpecifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchTrashedSpecifications = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const all = await specificationService.getSpecifications(projectId, true);
      const allArr = Array.isArray(all) ? all : [];
      // Filter to only soft-deleted items
      setTrashedSpecifications(allArr.filter((s) => s.isDeleted));
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Không thể tải danh sách đặc tả đã xoá.";
      setError(message);
      setTrashedSpecifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Refetch based on current view mode
  const refetch = useCallback(() => {
    if (viewMode === "trash") {
      fetchTrashedSpecifications();
    } else {
      fetchSpecifications();
    }
  }, [viewMode, fetchSpecifications, fetchTrashedSpecifications]);

  useEffect(() => {
    if (!projectId) return;
    refetch();
  }, [refetch]);

  const uploadSpecification = async (data: {
    name: string;
    description?: string;
    type: string;
    file: File;
  }) => {
    try {
      const newSpec = await specificationService.uploadSpecification({
        projectId,
        ...data,
      });
      await fetchSpecifications();
      return newSpec;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Poll a specification's parseStatus until it resolves to Success or Failed.
   * Useful after uploading OpenAPI YAML or Postman files which parse asynchronously.
   */
  const pollParseStatus = async (
    specId: string,
    options?: { intervalMs?: number; timeoutMs?: number },
  ): Promise<Specification> => {
    const intervalMs = options?.intervalMs ?? 2000;
    const timeoutMs = options?.timeoutMs ?? 120000; // 2 min default
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const spec = await specificationService.getSpecificationById(
        projectId,
        specId,
      );

      if (spec.parseStatus === "Success" || spec.parseStatus === "Failed") {
        await fetchSpecifications();
        return spec;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Specification parse timed out. Please check status later.");
  };

  const updateSpecification = async (
    specId: string,
    data: { name?: string; description?: string },
  ) => {
    try {
      const updated = await specificationService.updateSpecification(
        projectId,
        specId,
        data,
      );
      await fetchSpecifications();
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteSpecification = async (specId: string) => {
    try {
      await specificationService.deleteSpecification(projectId, specId);
      await fetchSpecifications();
    } catch (err) {
      throw err;
    }
  };

  const activateSpecification = async (specId: string) => {
    try {
      const activated = await specificationService.activateSpecification(
        projectId,
        specId,
      );
      await fetchSpecifications();
      return activated;
    } catch (err) {
      throw err;
    }
  };

  const deactivateSpecification = async (specId: string) => {
    try {
      const deactivated = await specificationService.deactivateSpecification(
        projectId,
        specId,
      );
      await fetchSpecifications();
      return deactivated;
    } catch (err) {
      throw err;
    }
  };

  // FE-18: Restore a soft-deleted specification
  const restoreSpecification = async (specId: string) => {
    try {
      await specificationService.restoreSpecification(projectId, specId);
      // Refresh both views
      await fetchTrashedSpecifications();
      await fetchSpecifications();
    } catch (err) {
      throw err;
    }
  };

  const createManualSpecification = async (
    pid: string,
    data: ManualSpecificationRequest,
  ) => {
    try {
      const result = await specificationService.createManualSpecification(
        pid,
        data,
      );
      await fetchSpecifications();
      return result;
    } catch (err) {
      throw err;
    }
  };

  return {
    specifications,
    trashedSpecifications,
    isLoading,
    error,
    viewMode,
    setViewMode,
    refetch,
    uploadSpecification,
    pollParseStatus,
    updateSpecification,
    deleteSpecification,
    activateSpecification,
    deactivateSpecification,
    restoreSpecification,
    createManualSpecification,
  };
}
