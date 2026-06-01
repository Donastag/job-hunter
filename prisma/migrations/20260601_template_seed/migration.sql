-- Seed default proposal templates
INSERT INTO "Template" (id, name, category, content, variables, wins, sent, "createdAt", "updatedAt")
VALUES
  ('T01', 'AI Automation', 'AI/ML',
   'I noticed your post about {{job_title}} — specifically the part about {{pain_point}}. That''s a pattern I''ve solved a few times.

My approach for a setup like yours ({{detected_stack}}) would be to build the automation in layers: start with the core trigger and data validation, then layer the AI logic on top so it''s testable at each stage. Cuts debugging time significantly.

I built something similar for a {{industry}} client recently — you can see how it works in my demo environment: {{demo_link}}

Quick question: is the main bottleneck the data coming in, or the logic deciding what to do with it?',
   '["job_title","pain_point","detected_stack","industry","demo_link"]', 0, 0, NOW(), NOW()),

  ('T02', 'API Integration', 'Backend',
   'I''ve integrated {{detected_stack}} with {{job_title}} before. The key is handling the authentication flow correctly and implementing proper error handling.

For this type of integration, I typically use {{industry}} patterns to ensure reliability and scalability. The whole thing can be wrapped up in about {{demo_link}} hours.

Would you be open to a quick call to discuss the specific requirements and timeline?',
   '["job_title","detected_stack","industry","demo_link"]', 0, 0, NOW(), NOW()),

  ('T03', 'SaaS Architecture', 'Architecture',
   'Your {{job_title}} project sounds interesting. Based on the stack you''re using ({{detected_stack}}), I''d recommend a microservices approach with {{industry}} for better scalability.

I''ve architected similar systems for {{pain_point}} companies, and the key is getting the data flow right from the start. Happy to share some diagrams and discuss the approach.

What''s your timeline looking like for this?',
   '["job_title","detected_stack","industry","pain_point"]', 0, 0, NOW(), NOW()),

  ('T04', 'Security Audit', 'Security',
   'Security audits are critical, especially for {{industry}} applications. I''ve conducted several HIPAA compliance reviews and can help identify potential vulnerabilities in your {{detected_stack}} setup.

The audit typically takes {{demo_link}} days and covers authentication, data encryption, and access controls. I''ll provide a detailed report with actionable recommendations.

Are you looking to complete this before a specific deadline?',
   '["industry","detected_stack","demo_link"]', 0, 0, NOW(), NOW()),

  ('T05', 'Bug Fix / Troubleshoot', 'Debugging',
   'I specialize in debugging complex issues like the one you''re describing. Based on your {{detected_stack}} setup, this is likely a {{pain_point}} issue.

I can usually identify and fix these types of problems within {{demo_link}} hours. My approach is systematic — isolate the issue, implement the fix, and add tests to prevent regression.

Would you be able to share the error logs so I can get a better understanding of what''s happening?',
   '["detected_stack","pain_point","demo_link"]', 0, 0, NOW(), NOW()),

  ('T06', 'Full Stack Build', 'Full Stack',
   'I can build your {{job_title}} from scratch using {{detected_stack}}. My approach focuses on clean architecture and maintainable code.

For a project of this scope, I typically deliver in {{demo_link}} phases, with regular check-ins to ensure we''re on track. The final product will be fully tested and documented.

What''s your preferred timeline, and do you have any specific requirements I should know about?',
   '["job_title","detected_stack","demo_link"]', 0, 0, NOW(), NOW())

ON CONFLICT (id) DO NOTHING;
