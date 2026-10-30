import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";

describe("WorkspaceController", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const workspaceId = "22222222-2222-4222-8222-222222222222";

  const request = {
    user: { id: userId },
  } as AuthenticatedRequest;

  const validBody = {
    name: "Mahdi Development",
    slug: "mahdi-development",
  };

  const createdWorkspace = {
    id: workspaceId,
    name: validBody.name,
    slug: validBody.slug,
    role: "OWNER" as const,
    createdAt: "2026-10-29T12:00:00.000Z",
  };

  const createMock = jest.fn();
  const findMineMock = jest.fn();
  const findOneMock = jest.fn();
  const updateMock = jest.fn();

  let controller: WorkspaceController;

  beforeEach(() => {
    jest.resetAllMocks();

    const workspaceServiceMock = {
      create: createMock,
      findMine: findMineMock,
      findOne: findOneMock,
      update: updateMock,
    };

    controller = new WorkspaceController(
      workspaceServiceMock as unknown as WorkspaceService,
    );
  });

  describe("create", () => {
    it("creates a workspace for the authenticated user", async () => {
      createMock.mockResolvedValue(createdWorkspace);

      const result = await controller.create(request, validBody);

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(userId, validBody);
      expect(result).toEqual(createdWorkspace);
    });

    it("rejects a workspace name shorter than 2 characters", async () => {
      await expect(
        controller.create(request, {
          name: "A",
          slug: "valid-slug",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects an invalid workspace slug", async () => {
      await expect(
        controller.create(request, {
          name: "Valid Workspace",
          slug: "invalid slug!",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects missing request body", async () => {
      await expect(controller.create(request, undefined)).rejects.toThrow(
        BadRequestException,
      );

      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects unexpected fields", async () => {
      await expect(
        controller.create(request, {
          ...validBody,
          role: "OWNER",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(createMock).not.toHaveBeenCalled();
    });

    it("normalizes workspace name and slug before calling service", async () => {
      createMock.mockResolvedValue(createdWorkspace);

      await controller.create(request, {
        name: "  Mahdi Development  ",
        slug: "  MAHDI-DEVELOPMENT  ",
      });

      expect(createMock).toHaveBeenCalledWith(userId, {
        name: "Mahdi Development",
        slug: "mahdi-development",
      });
    });
  });

  describe("findMine", () => {
    it("returns workspaces belonging to the authenticated user", async () => {
      findMineMock.mockResolvedValue([createdWorkspace]);

      const result = await controller.findMine(request);

      expect(findMineMock).toHaveBeenCalledTimes(1);
      expect(findMineMock).toHaveBeenCalledWith(userId);
      expect(result).toEqual([createdWorkspace]);
    });

    it("returns an empty array when the user has no workspaces", async () => {
      findMineMock.mockResolvedValue([]);

      const result = await controller.findMine(request);

      expect(findMineMock).toHaveBeenCalledWith(userId);
      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("returns workspace details for the authenticated user", async () => {
      findOneMock.mockResolvedValue(createdWorkspace);

      const result = await controller.findOne(request, workspaceId);

      expect(findOneMock).toHaveBeenCalledTimes(1);
      expect(findOneMock).toHaveBeenCalledWith(userId, workspaceId);
      expect(result).toEqual(createdWorkspace);
    });
  });

  describe("update", () => {
    const validUpdateBody = {
      name: "Mahdi Development Updated",
    };

    const updatedWorkspace = {
      ...createdWorkspace,
      name: validUpdateBody.name,
    };

    it("updates workspace for the authenticated user", async () => {
      updateMock.mockResolvedValue(updatedWorkspace);

      const result = await controller.update(
        request,
        workspaceId,
        validUpdateBody,
      );

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith(
        userId,
        workspaceId,
        validUpdateBody,
      );
      expect(result).toEqual(updatedWorkspace);
    });

    it("trims workspace name before calling service", async () => {
      updateMock.mockResolvedValue(updatedWorkspace);

      await controller.update(request, workspaceId, {
        name: "  Mahdi Development Updated  ",
      });

      expect(updateMock).toHaveBeenCalledWith(
        userId,
        workspaceId,
        validUpdateBody,
      );
    });

    it("rejects an invalid workspace name", async () => {
      await expect(
        controller.update(request, workspaceId, {
          name: "A",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects an empty request body", async () => {
      await expect(controller.update(request, workspaceId, {})).rejects.toThrow(
        BadRequestException,
      );

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("rejects unexpected role changes", async () => {
      await expect(
        controller.update(request, workspaceId, {
          name: "Updated Workspace",
          role: "OWNER",
        }),
      ).rejects.toThrow(BadRequestException);

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("propagates forbidden errors from the service", async () => {
      updateMock.mockRejectedValue(
        new ForbiddenException("Insufficient workspace permissions"),
      );

      await expect(
        controller.update(request, workspaceId, validUpdateBody),
      ).rejects.toThrow(ForbiddenException);

      expect(updateMock).toHaveBeenCalledWith(
        userId,
        workspaceId,
        validUpdateBody,
      );
    });
  });
});
