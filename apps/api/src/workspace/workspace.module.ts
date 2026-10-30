import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceAccessService } from "./workspace-access.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Module({
  imports: [JwtModule.register({})],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceAccessService, JwtAuthGuard],
  exports: [WorkspaceAccessService],
})
export class WorkspaceModule {}
