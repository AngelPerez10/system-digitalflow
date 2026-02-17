from django.urls import path

from .views import chat

urlpatterns = [
    path('ai/chat/', chat, name='ai-chat'),
]
