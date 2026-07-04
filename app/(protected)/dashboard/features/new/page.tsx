import { createFeatureRequest } from "@/features/dashboard/actions/features";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewFeatureRequestPage() {
  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Request a New Feature</CardTitle>
          <CardDescription>
            Provide details about the feature request. Our AI agent will clarify requirements and draft a PRD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createFeatureRequest} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-semibold text-foreground">Feature Name</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Add Dark Mode Toggle"
                required
                className="w-full border-border bg-background text-foreground focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold text-foreground">What should this feature do?</Label>
              <Textarea
                id="description"
                name="description"
                rows={6}
                placeholder="Describe the feature request, goals, or user behavior in detail..."
                required
                className="w-full border-border bg-background text-foreground focus:ring-primary focus:border-primary"
              />
            </div>
            <Button type="submit" className="w-full">
              Submit & Start AI Clarification
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
